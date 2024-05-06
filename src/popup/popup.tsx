import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import './popup.css';
import { FormControl, FormControlLabel, FormLabel } from '@mui/material';

const App: React.FC<{}> = () => {
  const [promptFormat, setPromptFormat] = useState<string>('sentences');
  const [showContent, setShowContent] = useState<boolean>(false);
  const handlePromptChange = (val) => {
    setPromptFormat(val.target.value);
  };

  useEffect(() => {
    // Determine what the locally stored prompt preference is
    chrome.storage.local.get('promptType', (value) => {
      // update prompt with local pref
      setPromptFormat(value.promptType);
      // show content after prompt set
      setShowContent(true);
    });
  }, []);
  // Update prompt type in storage on change of preference
  useEffect(() => {
    // Lets reload the content script / page content when pref is switched, this allows user to see summary with new pref type
    chrome.tabs.reload();
    // Update the local storage of promptType
    chrome.storage.local.set({ promptType: promptFormat });
  }, [promptFormat]); // Only run on change of promptFormat

  // If showContent, show this popup window, else show nothing
  return showContent ? (
    <Paper className="popUpPaper" elevation={24}>
      <Stack direction="column" alignItems="center">
        <div style={{ backgroundColor: '#f5f5f5', width: '100%' }}>
          <Typography
            variant="h5"
            fontSize="24px"
            justifyContent="space-between"
            width="100%"
            marginTop="16px"
            marginBottom="16px"
            textAlign="center"
          >
            ReBlurb Settings
          </Typography>
        </div>
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="flex-start"
          width="95%"
        >
          <Paper style={{ width: '100%', marginTop: '8px' }} elevation={2}>
            <FormControl fullWidth style={{ padding: '8px' }}>
              <FormLabel id="prompt-form">Summary Format</FormLabel>
              <RadioGroup
                name="prompt-decision-group"
                value={promptFormat}
                onChange={handlePromptChange}
              >
                <FormControlLabel
                  value="sentences"
                  control={<Radio />}
                  defaultChecked={'sentences' == promptFormat}
                  label="Short Sentenced Summary"
                />
                <FormControlLabel
                  value="bullets"
                  control={<Radio />}
                  defaultChecked={'bullets' == promptFormat}
                  label="Bullet Listed Summary"
                />
              </RadioGroup>
            </FormControl>
          </Paper>
        </Stack>
        <Paper
          elevation={2}
          style={{
            width: '95%',
            marginTop: '20px',
            marginLeft: '3px',
          }}
        >
          <Typography
            variant="h6"
            fontSize="20px"
            style={{ marginLeft: '8px' }}
          >
            Websites currently supported
          </Typography>
          <li style={{ fontSize: '14px', marginLeft: '12px' }}>Ebay</li>
          <li style={{ fontSize: '14px', marginLeft: '12px' }}>BestBuy</li>
          <li
            style={{
              fontSize: '14px',
              marginLeft: '12px',
              marginBottom: '6px',
            }}
          >
            PcPartPicker
          </li>
        </Paper>
      </Stack>
    </Paper>
  ) : null;
};

const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
root.render(<App />);
