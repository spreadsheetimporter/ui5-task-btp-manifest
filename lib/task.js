/* eslint-disable no-unused-vars, no-undef */
const path = require("path");
const fs = require("fs").promises;

function compareVersions(v1, v2) {
	const parts1 = v1.split("_").map(Number);
	const parts2 = v2.split("_").map(Number);

	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const part1 = parts1[i] || 0;
		const part2 = parts2[i] || 0;

		if (part1 > part2) return 1;
		if (part1 < part2) return -1;
	}

	return 0;
}

/**
 * Task to replace strings from files
 *
 * @param {object} parameters Parameters
 * @param {module:@ui5/logger/Logger} parameters.log Logger instance
 * @param {module:@ui5/fs.DuplexCollection} parameters.workspace DuplexCollection to read and write files
 * @param {object} parameters.taskUtil Specification Version dependent interface to a
 *                [TaskUtil]{@link module:@ui5/builder.tasks.TaskUtil} instance
 * @param {object} parameters.options Options
 * @param {Array} parameters.options.debug Debug flag
 * @param {Array} parameters.options.service Service name to be set in the manifest
 * @returns {Promise<undefined>} Promise resolving with undefined once data has been written
 */
module.exports = async function ({ log, workspace, taskUtil, options }) {
	const isDebug = options.configuration && options.configuration.debug;

	const service = options.configuration?.service ? options.configuration?.service : ""; // default
	const cwd = taskUtil.getProject().getRootPath() || process.cwd();

	const depPath = taskUtil.getDependencies();

	// get depPath starting with ui5-cc-spreadsheetimporter, should be only one
	const spreadsheetImporterPath = depPath.find((dep) => dep.includes("ui5-cc-spreadsheetimporter"));
	if (!spreadsheetImporterPath) {
		isDebug && log.info("ui5-cc-spreadsheetimporter not found in dependencies. Skipping manifest change.");
		return;
	}
	// getProject
	const spreadsheetImporterProject = taskUtil.getProject(spreadsheetImporterPath);
	const spreadsheetImporterRootPath = spreadsheetImporterProject.getRootPath();
	const nodeModuleSpreadsheetImporterManifestPath = path.join(spreadsheetImporterRootPath, "dist/manifest.json");
	const { createResource } = taskUtil.resourceFactory;

	// Check if ui5-cc-spreadsheetimporter is present in dependencies
	const packageJsonPath = path.join(cwd, "package.json");
	const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
	const hasSpreadsheetImporter = packageJson.dependencies && packageJson.dependencies["ui5-cc-spreadsheetimporter"];
	// replace all "." with "_" from hasSpreadsheetImporter
	const spreadsheetimporterversion = hasSpreadsheetImporter.replace(/\./g, "_");

	if (!hasSpreadsheetImporter) {
		isDebug && log.info("ui5-cc-spreadsheetimporter not found in dependencies. Skipping manifest change.");
		return;
	}

	// Find the manifest.json for ui5-cc-spreadsheetimporter
	const spreadsheetImportermanifestContent = await fs.readFile(nodeModuleSpreadsheetImporterManifestPath, "utf8");

	// if spreadsheetimporterversion less than 0_34_0, then use customControl and spreadsheetImporter
	const useCustomControl = compareVersions(spreadsheetimporterversion, "0_34_0") < 0;
	const pathSegment = useCustomControl ? "customControl/spreadsheetImporter" : "customControl/spreadsheetImporter";

	const spreadsheetImporterManifestPath = `/resources/${taskUtil
		.getProject()
		.getNamespace()}/thirdparty/${pathSegment}/v${spreadsheetimporterversion}/manifest.json`;
	const spreadsheetImporterManifestResource = createResource({
		path: spreadsheetImporterManifestPath,
		string: spreadsheetImportermanifestContent
	});

	if (!spreadsheetImportermanifestContent) {
		isDebug &&
			log.info("Couldn't find manifest.json for ui5-cc-spreadsheetimporter. It might not be in the build workspace.");
		return;
	}

	let spreadsheetImporterManifest;
	try {
		spreadsheetImporterManifest = JSON.parse(spreadsheetImportermanifestContent);
	} catch (error) {
		isDebug && log.info("Error parsing ui5-cc-spreadsheetimporter manifest:", error);
		return;
	}

	// Change "sap.cloud":"name" in the manifest
	if (!spreadsheetImporterManifest["sap.cloud"]) {
		spreadsheetImporterManifest["sap.cloud"] = {};
	}
	// Read the manifest.json
	try {
		const { projectNamespace } = options;
		const ui5AppmanifestPath = `/resources/${projectNamespace}/manifest.json`;
		isDebug && log.info(`Reading manifest from ${ui5AppmanifestPath}`);

		const ui5AppManifestResource = await workspace.byPath(ui5AppmanifestPath);
		if (!ui5AppManifestResource) {
			throw new Error(`Manifest not found at ${ui5AppmanifestPath}`);
		}

		const ui5AppManifestContent = await ui5AppManifestResource.getString();
		const ui5AppManifest = JSON.parse(ui5AppManifestContent);

		const manifestService = ui5AppManifest["sap.cloud"]?.service;
		if (!manifestService && !service) {
			isDebug && log.info("Service name not found in manifest.json and not provided in options. Skipping task.");
			return;
		}

		spreadsheetImporterManifest["sap.cloud"].service = service || manifestService;
		isDebug &&
			log.info(
				"Updated ui5-cc-spreadsheetimporter manifest with service name:",
				spreadsheetImporterManifest["sap.cloud"].service
			);

		// Write the updated manifest back to the workspace
		const updatedManifestContent = JSON.stringify(spreadsheetImporterManifest, null, 2);
		spreadsheetImporterManifestResource.setString(updatedManifestContent);
		await workspace.write(spreadsheetImporterManifestResource);

		isDebug &&
			log.info("Successfully updated ui5-cc-spreadsheetimporter manifest at:", spreadsheetImporterManifestPath);
	} catch (error) {
		isDebug && log.error(`Error processing manifest.json: ${error.message}`);
		return;
	}
};
