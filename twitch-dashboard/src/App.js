import { AppBar, Button, Divider, FormControlLabel, Grid, List, ListItem, ListItemIcon, ListItemText, ListSubheader, Switch, TextField, Toolbar, Typography } from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import FiberNewIcon from '@material-ui/icons/FiberNew';
import { useState } from 'react';
import { useQuery } from 'react-query';
import fetchJsonp from 'fetch-jsonp';
import './App.css';

const REFRESH_INTERVAL_IN_MILLIS = 20 * 1000;

const CHAT_SECTIONS_TO_SHOW = {
  broadcaster: {
    key: "broadcaster",
    display: "Broadcaster"
  },
  moderators: {
    key: "moderators",
    display: "Moderators"
  },
  vips: {
    key: "vips",
    display: "VIPs"
  }, 
  viewers: {
    key: "viewers", 
    display: "Viewers"
  }
};

const lexographicSort = (a, b) => a.localeCompare(b);
  
function App() {
  const [channel, setChannel] = useState('LindseyRooney'); 
  const [ workingChannel, setWorkingChannel] = useState('LindseyRooney');
  const [ lastChatters, setLastChatters ] = useState(new Set()); 
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const flattenAndPurgeLastChatters = (chatters = {}) => {
    const lastChattersSet = Object.keys(chatters).reduce((lastChattersFlattened, section) => {
      const chattersInSection = chatters[section] || [];
      chattersInSection.forEach((chatter) => {
        lastChattersFlattened.add(chatter);
      });
      return lastChattersFlattened;
    }, new Set());
    setLastChatters(lastChattersSet);
  }
  
  const { data, refetch } = useQuery(['chatters', channel], () => {
    flattenAndPurgeLastChatters(data ? data.chatters : {});
    return fetchJsonp(`https://tmi.twitch.tv/group/user/${channel.toLowerCase()}/chatters`).then(res => {
      return res.json();
    }).then((json) => {
      console.log('JSON', json);
      return json.data;
    });
  }, {
    enabled: channel && channel !== '' && autoRefreshEnabled,
    refetchInterval: REFRESH_INTERVAL_IN_MILLIS,
  });

  const commitChannelChange = () => {
    setChannel(workingChannel);
    setLastChatters(new Set());
  }

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  }

  const onTwitchChannelChange = (event) => {
    setWorkingChannel(event.target.value);
  }

  const mapToListItem = (account, isNew) => {
    return (
      <ListItem key={account}>
          {
            isNew && (
              <ListItemIcon>
                <FiberNewIcon />
              </ListItemIcon>
            )
          }
          <ListItemText
            primary={account}
          />
      </ListItem>
    );
  }

  const renderListSection = ({key, display}) => {
    if (!data || !data.chatters) {
      return null;
    }

    const inSection = data.chatters[key] || [];
    if (inSection.length === 0) {
      return null;
    }

    const {newViewers, currentViewers} = inSection.reduce((partitions, account) => {
      const isNew = lastChatters.size > 0 && !lastChatters.has(account);

      if (isNew) {
        return {
          ...partitions,
          newViewers: [...partitions.newViewers, account]
        }
      } else {
        return {
          ...partitions,
          currentViewers: [...partitions.currentViewers, account]
        }
      }
    }, {
      newViewers: [],
      currentViewers: []
    });

    const isLargeViewersSection = key === "viewers" && currentViewers.length > 100;

    // Hide empty sections
    if (newViewers.length === 0  && (currentViewers.length === 0 || isLargeViewersSection)) {
      return null;
    }

    newViewers.sort(lexographicSort);
    currentViewers.sort(lexographicSort);

    const newViewersMapped = newViewers.map((account) => mapToListItem(account, true));
    const currentViewersMapped = !isLargeViewersSection ? 
      currentViewers.map((account) => mapToListItem(account, false)) :
      [];

    return [
      (<ListSubheader key={display} style={{backgroundColor: "white"}}>{display}</ListSubheader>),
      ...newViewersMapped,
      ...currentViewersMapped
    ]
  }

  const count = data ? data.chatter_count : "?"

  return (
    <div className="App">
      <div className="TwitchChannel">
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6">
              Twitch Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
        <Grid
          container
          alignItems="center"
          justify="center"
          spacing={1}
          style={{marginTop: "10px", padding: "10px"}}
        >
          <Grid item xs={12}>
            <TextField 
              fullWidth 
              label="Twitch Channel" 
              onBlur={commitChannelChange}
              onChange={onTwitchChannelChange}
              value={workingChannel} 
              variant="outlined"
            />
          </Grid>
          <Grid item xs={8}>
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
              label="Auto refresh enabled"
            />
          </Grid>
          <Grid item xs={4} style={{display: "flex", justifyContent: "flex-end"}}>
            <Button
              disabled={!channel}
              onClick={refetch}
              variant="contained"
              color="default"
              startIcon={<RefreshIcon />}
            >
              Refresh Now
            </Button>
          </Grid>
          <Grid item xs={12}><Divider /></Grid>
          <Grid item xs={12}>
            <Typography variant="h6">
              Channel Members ({count})
            </Typography>
            <Typography variant="subtitle2">
              If you have over 100 viewers, only new viewers will be shown. All new users will be shown.
            </Typography>
          </Grid>
          <Grid item xs={12}><Divider /></Grid>
          <Grid item xs={12}>
            <List dense>
              {renderListSection(CHAT_SECTIONS_TO_SHOW['viewers'])}
              {renderListSection(CHAT_SECTIONS_TO_SHOW['vips'])}
              {renderListSection(CHAT_SECTIONS_TO_SHOW['moderators'])}
            </List>
          </Grid>
        </Grid>
      </div>
    </div>
  );
}

export default App;
