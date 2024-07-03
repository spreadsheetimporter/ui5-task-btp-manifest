/* eslint-disable no-unused-vars, no-undef */
const path = require("path");
const fs = require("fs").promises;

/**
 * Task to replace strings from files
 *
 * @param {object} parameters Parameters
 * @param {module:@ui5/logger/Logger} parameters.log Logger instance
 * @param {module:@ui5/fs.DuplexCollection} parameters.workspace DuplexCollection to read and write files
 * @param {module:@ui5/fs.AbstractReader} parameters.dependencies Reader or Collection to read dependency files
 * @param {object} parameters.options Options
 * @param {Array} parameters.options.files all file name patterns where replace should occur
 * @param {Array} [parameters.options.strings] Array of objects containing placeholder and replacment text value
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
	const spreadsheetImporterManifestPath = `/resources/${taskUtil.getProject().getNamespace()}/thirdparty/customcontrol/spreadsheetimporter/v${spreadsheetimporterversion}/manifest.json`;
	const spreadsheetImporterManifestResource = createResource({
		path: spreadsheetImporterManifestPath,
		string: spreadsheetImportermanifestContent
	});

	if (!spreadsheetImportermanifestContent) {
		isDebug && log.info("Couldn't find manifest.json for ui5-cc-spreadsheetimporter. It might not be in the build workspace.");
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
	const { projectNamespace } = options;
	const ui5AppmanifestPath = `/resources/${projectNamespace}/manifest.json`;
	isDebug && log.info(`Reading manifest from ${ui5AppmanifestPath}`);
	const ui5AppManifestResource = await workspace.byPath(ui5AppmanifestPath);
	const ui5AppManifestContent = await ui5AppManifestResource.getString();
	const ui5AppManifest = JSON.parse(ui5AppManifestContent);
	if(service !== ""){
		spreadsheetImporterManifest["sap.cloud"].service = service;
	} else {
		spreadsheetImporterManifest["sap.cloud"].service = ui5AppManifest["sap.cloud"].service; // Or any other value you want to set
	}
	isDebug && log.info("Updated ui5-cc-spreadsheetimporter manifest with servicename:", spreadsheetImporterManifest["sap.cloud"].service);

	// Write the updated manifest back to the workspace
	spreadsheetImporterManifestResource.setString(JSON.stringify(spreadsheetImporterManifest, null, 2));

	await workspace.write(spreadsheetImporterManifestResource);

	isDebug && log.info("Successfully updated ui5-cc-spreadsheetimporter manifest to path:", spreadsheetImporterManifestPath);
};
