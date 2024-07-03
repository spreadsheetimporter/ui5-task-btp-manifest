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

	// get all environment variables
	const prefix = options.configuration?.prefix ? options.configuration?.prefix : "UI5_ENV"; // default
	// const path = options.configuration?.path ? options.configuration?.path : "./"; // default
	const separator = options.configuration?.separator ? options.configuration?.separator : "."; // default
	const cwd = taskUtil.getProject().getRootPath() || process.cwd();

	const depPath = taskUtil.getDependencies();

	// get depPath starting with ui5-cc-spreadsheetimporter, should be only one
	const spreadsheetImporterPath = depPath.find((dep) => dep.includes("ui5-cc-spreadsheetimporter"));
	if (!spreadsheetImporterPath) {
		console.log("ui5-cc-spreadsheetimporter not found in dependencies. Skipping manifest change.");
		return;
	}
	// getProject
	const spreadsheetImporterProject = taskUtil.getProject(spreadsheetImporterPath);
	const spreadsheetImporterRootPath = spreadsheetImporterProject.getRootPath();
	const nodeModuleSpreadsheetImporterManifestPath = path.join(spreadsheetImporterRootPath, "dist/manifest.json");
	const { createResource } = taskUtil.resourceFactory;

	// derive the configuration and default values
	const config = Object.assign(
		{
			debug: false,
			skipTransform: false
		},
		options.configuration
	);

	// Check if ui5-cc-spreadsheetimporter is present in dependencies
	const packageJsonPath = path.join(cwd, "package.json");
	const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
	const hasSpreadsheetImporter = packageJson.dependencies && packageJson.dependencies["ui5-cc-spreadsheetimporter"];
	// replace all "." with "_" from hasSpreadsheetImporter
	const spreadsheetimporterversion = hasSpreadsheetImporter.replace(/\./g, "_");

	if (!hasSpreadsheetImporter) {
		console.log("ui5-cc-spreadsheetimporter not found in dependencies. Skipping manifest change.");
		return;
	}

	// Find the manifest.json for ui5-cc-spreadsheetimporter
	const manifestContent = await fs.readFile(nodeModuleSpreadsheetImporterManifestPath, "utf8");
	const spreadsheetImporterManifestPath = `/resources/${taskUtil.getProject().getNamespace()}/thirdparty/customcontrol/spreadsheetimporter/v${spreadsheetimporterversion}/manifest.json`;
	const manifestResource = createResource({
		path: spreadsheetImporterManifestPath,
		string: manifestContent
	});

	if (!manifestContent) {
		console.log("Couldn't find manifest.json for ui5-cc-spreadsheetimporter. It might not be in the build workspace.");
		return;
	}

	let manifest;
	try {
		manifest = JSON.parse(manifestContent);
	} catch (error) {
		console.error("Error parsing ui5-cc-spreadsheetimporter manifest:", error);
		return;
	}

	// Change "sap.cloud":"name" in the manifest
	if (!manifest["sap.cloud"]) {
		manifest["sap.cloud"] = {};
	}
	// Read the manifest.json
	const { projectNamespace } = options;
	const manifestPath = `/resources/${projectNamespace}/manifest.json`;
	const manifestResource2 = await workspace.byPath(manifestPath);
	const manifestContent2 = await manifestResource2.getString();
	const manifest2 = JSON.parse(manifestContent2);
	manifest["sap.cloud"].service = manifest2["sap.cloud"].service; // Or any other value you want to set

	// Write the updated manifest back to the workspace
	manifestResource.setString(JSON.stringify(manifest, null, 2));

	await workspace.write(manifestResource);

	console.log("Successfully updated ui5-cc-spreadsheetimporter manifest.");
};

/**
 * Callback function to define the list of required dependencies
 *
 * @returns {Promise<Set>}
 *      Promise resolving with a Set containing all dependencies
 *      that should be made available to the task.
 *      UI5 Tooling will ensure that those dependencies have been
 *      built before executing the task.
 */
module.exports.determineRequiredDependencies = async function () {
	return new Set();
};
