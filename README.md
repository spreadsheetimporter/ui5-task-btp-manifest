# UI5 task to change Spreadsheet Importer manifest

## Install

```bash
npm install --save-devui5-task-btp-manifest
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
