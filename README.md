# UI5 task to change Spreadsheet Importer manifest

When deploying the UI5 App which has integrated the Spreadsheet Importer to the SAP BTP, the service name in the manifest.json of the Spreadsheet Importer has to be the same as in the UI5 App using the Spreadsheet Importer.  
This task will change the service name in the manifest.json of the Spreadsheet Importer to the service name of the UI5 App so no manual changes are needed.

https://www.npmjs.com/package/ui5-task-btp-manifest

## Install

```bash
npm install --save-dev ui5-task-btp-manifest
```

## Usage

Ideally, you don´t need to set the service name in the configuration. The task will try to get the service name from the UI5 App manifest.

Add the following configuration to your `ui5.yaml` file:

```yml
builder:
  customTasks:
    - name: ui5-task-btp-manifest
      afterTask: replaceVersion
      configuration:
        service: "this-is-the-service-name"
        debug: true
```

## Configuration options

- `service`: The name of the service to be used in the manifest.json of the Spreadsheet Importer. If not specified, the value from the UI5 App manifest is used.
- `debug`: If set to `true`, the task will log additional information to the console.  
