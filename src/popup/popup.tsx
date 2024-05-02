import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import Divider from '@mui/material/Divider';
import './popup.css';
import { FormControl, FormControlLabel, FormLabel } from '@mui/material';

const App: React.FC<{}> = () => {
  const [promptFormat, setPromptFormat] = useState<string>('sentences');
  const [showContent, setShowContent] = useState<boolean>(false);
  const handlePromptChange = (val) => {
    setPromptFormat(val.target.value);
  };

  useEffect(() => {
    chrome.storage.local.get('promptType', (value) => {
      setPromptFormat(value.promptType);
      setShowContent(true);
    });
  }, []);
  useEffect(() => {
    chrome.storage.local.set({ promptType: promptFormat });
    console.log(promptFormat);
  }, [promptFormat]);

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
      </Stack>
    </Paper>
  ) : null;
};

const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
root.render(<App />);
