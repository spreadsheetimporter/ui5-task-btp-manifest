# UI5 task to change Spreadsheet Importer manifest

## Install

```bash
npm install --save-devui5-task-btp-manifest
```

## Usage

```yml
builder:
  customTasks:
    - name: ui5-task-btp-manifest
      afterTask: replaceVersion
```