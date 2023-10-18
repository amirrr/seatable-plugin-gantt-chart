import React from "react";
import PropTypes from "prop-types";
import { Modal, ModalHeader, ModalBody } from "reactstrap";
import DTable from "dtable-sdk";

import TimelineSetting from "./components/gantt-setting";
import GanttSettings from "./components/gantt-setting";
import intl from "react-intl-universal";
import { getStartEndDateForProject, initTasks } from "./helper";
import "./locale/index.js";

import "./css/app.css";
import "./css/dropdown-menu.css";
import "./css/row-expand.css";
import "./css/switch.css";
import "./css/timeline-setting.css";

import timelineLogo from "./assets/image/icon.png";

import {
  Gantt,
  Task,
  EventOption,
  StylingOption,
  ViewMode,
  DisplayOption,
} from "gantt-task-react";

import "gantt-task-react/dist/index.css";

const propTypes = {
  isDevelopment: PropTypes.bool,
  showDialog: PropTypes.bool,
  row: PropTypes.object, // If the plugin is opened with a button, it will have a row parameter
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      showDialog: props.showDialog || false,
      tasks: initTasks(),
      showSettings: false,
    };
    this.dtable = new DTable();
  }

  componentDidMount() {
    this.initPluginDTableData();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({ showDialog: nextProps.showDialog });
  }

  componentWillUnmount() {
    this.unsubscribeLocalDtableChanged();
    this.unsubscribeRemoteDtableChanged();
  }

  async initPluginDTableData() {
    const { isDevelopment } = this.props;
    if (isDevelopment) {
      // local develop
      await this.dtable.init(window.dtablePluginConfig);
      await this.dtable.syncWithServer();
      this.dtable.subscribe("dtable-connect", () => {
        this.onDTableConnect();
      });
    } else {
      // integrated to dtable app
      this.dtable.initInBrowser(window.app.dtableStore);
    }
    this.unsubscribeLocalDtableChanged = this.dtable.subscribe(
      "local-dtable-changed",
      () => {
        this.onDTableChanged();
      }
    );
    this.unsubscribeRemoteDtableChanged = this.dtable.subscribe(
      "remote-dtable-changed",
      () => {
        this.onDTableChanged();
      }
    );
    this.resetData();
  }

  onDTableConnect = () => {
    this.resetData();
  };

  onDTableChanged = () => {
    this.resetData();
  };

  resetData = () => {
    this.setState({ isLoading: false });
  };

  onPluginToggle = () => {
    this.setState({ showDialog: false });
    window.app.onClosePlugin();
  };

  handleExpanderClick = (task) => {
    this.setState({ tasks: tasks.map((t) => (t.id === task.id ? task : t)) });
    console.log("On expander click Id:" + task.id);
  };

  toggleSettingsPanel = () => {
    this.setState((prevState) => ({
      showSettings: !prevState.showSettings,
    }));
  };

  render() {
    let { isLoading, showDialog, tasks, showSettings } = this.state;
    if (isLoading) {
      return "";
    }

    let subtables = this.dtable.getTables();
    let collaborators = this.dtable.getRelatedUsers();

    const columnName = "0000";
    const columnStart = "5T13";
    const columnFinish = "4LPw";
    const columnLink = "s5S1";

    const table = subtables[1];
    const viewName = "Default View";

    // reading the link logic
    const view = this.dtable.getViewByName(table, viewName);
    const rows = this.dtable.getViewRows(view, table);
    const findLinkRows = rows.slice(0, 5);
    const links = this.dtable.getTableLinkRows(findLinkRows, table);

    const display = rows.map((row) => row[columnName]);

    const tasks2 = rows.map((row, index) => {
      const startDate = new Date(row[columnStart]);
      const endDate = new Date(row[columnFinish]);

      return {
        start: startDate,
        end: endDate,
        name: row[columnName],
        id: row._id,
        progress: 0,
        dependencies: links[row._id][columnLink],
        type: "task",
        project: "ProjectSample",
      };
    });

    return (
      <div
        className="dtable-plugin plugin-timeline"
        ref={(ref) => (this.plugin = ref)}
        onClick={this.onTimelineClick}
      >
        <div className="plugin-header">
          <div className="plugin-logo">
            <img
              className="plugin-logo-icon"
              src={timelineLogo}
              alt="gantt-chart"
            />
            <span>Gantt Chart</span>
          </div>
          <div className="timeline-views-tabs">
            <div className="views-tabs-scroll d-flex pr-1">
              <div className="view-item active" draggable="true">
                <div className="view-item-content d-flex align-items-center justify-content-center position-relative">
                  <div className="view-name">Default View</div>
                  <div className="btn-view-dropdown d-flex align-items-center justify-content-center">
                    <i className="dtable-font dtable-icon-drop-down"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="btn-add-view">
              <i className="dtable-font dtable-icon-add-table"></i>
            </div>
          </div>
          <div className="timeline-operators">
            <span className="timeline-operator dtable-font dtable-icon-download btn-export-image"></span>
            <span className="timeline-operator dtable-font dtable-icon-set-up btn-settings">
              <i
                className="bi bi-gear-fill"
                onClick={this.toggleSettingsPanel} // Add a click event to show/hide settings
              ></i>
            </span>
            <span className="timeline-operator dtable-font dtable-icon-x">
              <i className="bi bi-x-lg"></i>
            </span>
          </div>
        </div>

        <div className="timeline-container o-hidden">
          <Gantt
            tasks={tasks2}
            onExpanderClick={this.handleExpanderClick}
            listCellWidth={"155px"}
            barBackgroundColor="blue"
            rowHeight={40}
            fontSize={12}
          />

          <GanttSettings showSettings={showSettings} />
        </div>

        {console.log(rows)}
      </div>
    );
  }
}

App.propTypes = propTypes;

export default App;
