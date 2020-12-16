import {
  AppBar,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  makeStyles,
  Switch,
  TextField,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  withStyles,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import RefreshIcon from "@material-ui/icons/Refresh";
import FiberNewIcon from "@material-ui/icons/FiberNew";
import SettingsIcon from "@material-ui/icons/Settings";
import { useState } from "react";
import { useQuery } from "react-query";
import fetchJsonp from "fetch-jsonp";
import "./App.css";

const REFRESH_INTERVAL_IN_MILLIS = 20 * 1000;

const CHAT_SECTIONS_TO_SHOW = {
  broadcaster: {
    key: "broadcaster",
    display: "Broadcaster",
  },
  moderators: {
    key: "moderators",
    display: "Moderators",
  },
  vips: {
    key: "vips",
    display: "VIPs",
  },
  viewers: {
    key: "viewers",
    display: "Viewers",
  },
};

const StyledMenu = withStyles({
  paper: {
    border: "1px solid #d3d4d5",
  },
})((props) => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "center",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "center",
    }}
    {...props}
  />
));

const lexographicSort = (a, b) => a.localeCompare(b);

const menuId = "app-settings";

const useStyles = makeStyles((theme) => ({
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightBold,
  },
}));

function App() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [channel, setChannel] = useState("LindseyRooney");
  const [workingChannel, setWorkingChannel] = useState("LindseyRooney");
  const [lastChatters, setLastChatters] = useState(new Set());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const handleMenuClick = (event) => {
    if (anchorEl === null) {
      setAnchorEl(event.target);
    } else {
      setAnchorEl(null);
    }
  };

  const flattenAndPurgeLastChatters = (chatters = {}) => {
    const lastChattersSet = Object.keys(chatters).reduce(
      (lastChattersFlattened, section) => {
        const chattersInSection = chatters[section] || [];
        chattersInSection.forEach((chatter) => {
          lastChattersFlattened.add(chatter);
        });
        return lastChattersFlattened;
      },
      new Set()
    );
    setLastChatters(lastChattersSet);
  };

  const { data, refetch } = useQuery(
    ["chatters", channel],
    () => {
      flattenAndPurgeLastChatters(data ? data.chatters : {});
      return fetchJsonp(
        `https://tmi.twitch.tv/group/user/${channel.toLowerCase()}/chatters`
      )
        .then((res) => {
          return res.json();
        })
        .then((json) => {
          console.log("JSON", json);
          return json.data;
        });
    },
    {
      enabled: channel && channel !== "" && autoRefreshEnabled,
      refetchInterval: REFRESH_INTERVAL_IN_MILLIS,
    }
  );

  const commitChannelChange = () => {
    setChannel(workingChannel);
    setLastChatters(new Set());
  };

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  const onTwitchChannelChange = (event) => {
    setWorkingChannel(event.target.value);
  };

  const mapToListItem = (account, isNew) => {
    return (
      <ListItem key={account}>
        {isNew && (
          <ListItemIcon>
            <FiberNewIcon />
          </ListItemIcon>
        )}
        <ListItemText primary={account} />
      </ListItem>
    );
  };

  const renderListSection = ({ key, display }) => {
    if (!data || !data.chatters) {
      return null;
    }

    const inSection = data.chatters[key] || [];
    if (inSection.length === 0) {
      return null;
    }

    const { newViewers, currentViewers } = inSection.reduce(
      (partitions, account) => {
        const isNew = lastChatters.size > 0 && !lastChatters.has(account);

        if (isNew) {
          return {
            ...partitions,
            newViewers: [...partitions.newViewers, account],
          };
        } else {
          return {
            ...partitions,
            currentViewers: [...partitions.currentViewers, account],
          };
        }
      },
      {
        newViewers: [],
        currentViewers: [],
      }
    );

    const isLargeViewersSection =
      key === "viewers" && currentViewers.length > 100;

    // Hide empty sections
    if (
      newViewers.length === 0 &&
      (currentViewers.length === 0 || isLargeViewersSection)
    ) {
      return null;
    }

    newViewers.sort(lexographicSort);
    currentViewers.sort(lexographicSort);

    const newViewersMapped = newViewers.map((account) =>
      mapToListItem(account, true)
    );
    const currentViewersMapped = !isLargeViewersSection
      ? currentViewers.map((account) => mapToListItem(account, false))
      : [];

    return [
      <ListSubheader key={display} style={{ backgroundColor: "white" }}>
        {display}
      </ListSubheader>,
      ...newViewersMapped,
      ...currentViewersMapped,
    ];
  };

  const count = data ? data.chatter_count : "?";

  const classes = useStyles();

  return (
    <div className="App">
      <div className="TwitchChannel">
        <AppBar position="static">
          <Toolbar className={classes.toolbar}>
            <Typography variant="h6">Twitch Dashboard</Typography>
            <IconButton
              edge="end"
              aria-label="settings"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleMenuClick}
              color="inherit"
            >
              <SettingsIcon />
            </IconButton>
            <StyledMenu
              id="settings-menu"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleMenuClick}
            >
              <MenuItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefreshEnabled}
                      disabled={!channel}
                      onChange={toggleAutoRefresh}
                      name="autoRefresh"
                      color="primary"
                    />
                  }
                  label={`Auto refresh ${
                    autoRefreshEnabled ? "enabled" : "disabled"
                  }`}
                />
              </MenuItem>
              <Divider />
              <MenuItem disabled={!channel} onClick={refetch}>
                <ListItemIcon>
                  <RefreshIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Refresh Now" />
              </MenuItem>
            </StyledMenu>
          </Toolbar>
        </AppBar>
        <Grid
          container
          alignItems="center"
          justify="center"
          spacing={1}
          style={{ padding: "10px" }}
        >
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  {channel} Channel Members ({count})
                </Typography>
              </AccordionSummary>
              <AccordionDetails style={{display: 'flex', flexDirection: 'column'}}>
                <TextField
                  fullWidth
                  label="Your Twitch Channel"
                  onBlur={commitChannelChange}
                  onChange={onTwitchChannelChange}
                  value={workingChannel}
                  variant="outlined"
                />
                <Typography align="center" variant="body2" style={{marginTop: "15px"}}>
                  If you have over 100 viewers, only new viewers will be shown. 
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Grid>
          <Grid item xs={12}>
            <List dense>
              {renderListSection(CHAT_SECTIONS_TO_SHOW["viewers"])}
              {renderListSection(CHAT_SECTIONS_TO_SHOW["vips"])}
              {renderListSection(CHAT_SECTIONS_TO_SHOW["moderators"])}
            </List>
          </Grid>
        </Grid>
      </div>
    </div>
  );
}

export default App;
