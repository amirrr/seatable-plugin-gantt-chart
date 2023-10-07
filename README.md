# SeaTable Gantt Chart Plugin

The SeaTable Gantt Chart plugin allows you to enhance your SeaTable tables with interactive Gantt charts for project management and scheduling. This plugin is written in JavaScript and can be easily added to your SeaTable tables.

## Plugin Directory Structure

your-plugin
├── main.js                 // Compiled JavaScript file
├── info.json               // Plugin info file
├── media                   // Plugin static files folder
│   ├── main.css            // Compiled CSS file
│   ├── icon.png            // Icon image of the plugin
│   └── card_image.png      // Background image for the plugin icon

The info.json file contains plugin metadata, including the name, version, display type, display name, description, and information about included files.

## Plugin Features

    Interactive Gantt Charts: Visualize project timelines and task dependencies.
    Customizable Display: Configure the Gantt chart's appearance to suit your needs.
    Seamless Integration: Easily integrate the Gantt chart into your SeaTable workspace.
    Local Development: Develop and test the plugin locally with sample data.

## Getting Started

Follow these steps to start using the SeaTable Gantt Chart plugin:
1. Clone the Project

Clone the Gantt Chart plugin project to your local machine.
2. Customize Plugin Information

In the plugin-config folder, update the info.json file with your plugin's information:

    "name": The English name of the plugin (letters, numbers, underscores).
    "version": The plugin version in the format like "1.0.3".
    "display_type": Set to 'dialog' or 'overlay' based on the display mode.
    "display_name": The name displayed for the plugin.
    "description": A brief description of the plugin's functionality.

3. Register the Plugin

In the entry.js file, register your plugin by updating the following line:

javascript

window.app.registerPluginItemCallback(name, GanttChart.execute);

Replace name with the value from your info.json file.
4. Configure Plugin Development (Local)

Copy the setting.local.dist.js file and create a setting.local.js file. Customize the configuration in setting.local.js to access your SeaTable data during local development.
5. Internationalization Support (Optional)

If you want to support multiple languages, follow these steps:

    Add supported language files in the src/locale/lang directory.
    Define language-specific key-value pairs in the language files.
    Import the language files in src/locale/index.js.
    Use the react-intl-universal library for internationalization within your plugin.

6. Start Development

    Run npm install to install plugin dependencies.
    Run npm run start to launch the local development environment.
    Test your plugin with sample data.
    Use SeaTable's dtable-sdk to interact with your tables and build the Gantt chart functionality in the App.js file.

7. Build and Upload the Plugin

    Run npm run build-plugin to package the plugin.
    Upload the plugin to your SeaTable workspace for production use.

Now you have successfully developed and deployed the SeaTable Gantt Chart plugin to enhance your project management capabilities.