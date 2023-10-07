/**
 * local development settings
 */
import dotenv from 'dotenv';
dotenv.config();

console.log(process.env)

export default {
  // dtable api token (required)
  APIToken: process.env.API_TOKEN,
  // server URL of the dtable of the plugin (required)
  server: process.env.SERVER_URL,
  // id of the workspace with the dtable of the plugin (required, workspace must exist)
  workspaceID: process.env.WORKSPACE_ID,
  // name of the dtable to add the plugin to (required, dtable must exist under this name)
  dtableName: process.env.DTABLE_NAME,
  // default language ('en' or 'zh-cn' are common, see "src/locale/index.js" for all lang keys)
  lang: process.env.LANG
};
