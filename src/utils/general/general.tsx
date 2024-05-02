import React, { useEffect, useState } from 'react';
import { Paper, IconButton, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';

export function Summary(
  hideSummary,
  noMoreReviews,
  reviews,
  handleRefreshSummary,
  handleHideSummary,
  summary
) {
  return (
    <>
      {!hideSummary ? (
        <Paper className="summaryReview" elevation={24}>
          <IconButton
            style={{ position: 'absolute', top: '0px', left: '0px' }}
            onClick={handleRefreshSummary}
          >
            <RefreshIcon />
          </IconButton>
          <IconButton
            style={{ position: 'absolute', top: '0px', right: '0px' }}
            onClick={handleHideSummary}
          >
            <CloseIcon />
          </IconButton>
          <Stack direction="column" alignItems="center" useFlexGap width="100%">
            <Stack
              direction="row"
              alignItems="baseline"
              justifyContent="center"
              width="100%"
              style={{ backgroundColor: '#f5f5f5' }}
            >
              <Typography
                variant="h5"
                fontSize="24px"
                justifyContent="space-between"
                width="100%"
                marginTop="16px"
                marginBottom="10px"
                textAlign="center"
              >
                Product Summary
              </Typography>
            </Stack>
            {summary !== null ? <p>{summary}</p> : 'Loading...'}
          </Stack>
        </Paper>
      ) : null}
    </>
  );
}
