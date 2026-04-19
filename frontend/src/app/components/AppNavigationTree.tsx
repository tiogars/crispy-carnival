import { Box, Button, Collapse, Paper, Stack } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeIcon from '@mui/icons-material/Home';
import MovieIcon from '@mui/icons-material/Movie';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { useState } from 'react';

import type { Film, Reel, UploadWitnessVideoResponse } from '../App.types';

type NavigationNode = 'home' | `film-${string}` | `witnesses-${string}` | `witness-${string}` | `reels-${string}` | `reel-${string}` | `sequences-${string}`;

type AppNavigationTreeProps = {
  films: Film[];
  reels: Record<string, Reel[]>;
  witnessVideos: Record<string, UploadWitnessVideoResponse[]>;
  selectedNode: NavigationNode | '';
  onNodeSelect: (node: NavigationNode) => void;
};

type TreeItemProps = {
  nodeId: NavigationNode;
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: (nodeId: NavigationNode) => void;
  children?: React.ReactNode;
  hasChildren?: boolean;
};

const TreeItemButton = ({ nodeId, label, icon, isSelected, onSelect, children, hasChildren }: TreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Box>
      <Button
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
          onSelect(nodeId);
        }}
        startIcon={
          hasChildren ? isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon /> : icon
        }
        sx={{
          width: '100%',
          justifyContent: 'flex-start',
          textTransform: 'none',
          backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
          color: isSelected ? '#1976d2' : 'text.primary',
          padding: '8px 12px',
          marginBottom: 0.5,
          '&:hover': {
            backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
          },
          fontSize: '0.9rem',
          fontWeight: isSelected ? 600 : 500,
        }}
      >
        {!hasChildren && icon}
        {label}
      </Button>
      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ paddingLeft: 2 }}>{children}</Box>
        </Collapse>
      )}
    </Box>
  );
};

export const AppNavigationTree = ({
  films,
  reels,
  witnessVideos,
  selectedNode,
  onNodeSelect,
}: Readonly<AppNavigationTreeProps>) => {
  return (
    <Paper
      component="nav"
      sx={{
        borderRadius: 1.5,
        padding: 1.5,
        boxShadow: '0 8px 24px rgba(17, 25, 40, 0.08)',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <Stack spacing={0.5}>
        <TreeItemButton
          nodeId="home"
          label="Dashboard"
          icon={<HomeIcon />}
          isSelected={selectedNode === 'home'}
          onSelect={onNodeSelect}
        />

        {films.map((film) => (
          <TreeItemButton
            key={film.id}
            nodeId={`film-${film.id}`}
            label={film.displayName}
            icon={<MovieIcon />}
            isSelected={selectedNode === `film-${film.id}`}
            onSelect={onNodeSelect}
            hasChildren
          >
            <TreeItemButton
              nodeId={`witnesses-${film.id}`}
              label="Witnesses"
              icon={<VideoLibraryIcon />}
              isSelected={selectedNode === `witnesses-${film.id}`}
              onSelect={onNodeSelect}
              hasChildren={Boolean((witnessVideos[film.id]?.length ?? 0) > 0)}
            >
              {(witnessVideos[film.id] ?? []).map((video) => (
                <TreeItemButton
                  key={video.fileName}
                  nodeId={`witness-${film.id}-${video.fileName}`}
                  label={video.fileName}
                  icon={<PlayCircleIcon sx={{ fontSize: '1rem' }} />}
                  isSelected={selectedNode === `witness-${film.id}-${video.fileName}`}
                  onSelect={onNodeSelect}
                />
              ))}
            </TreeItemButton>

            <TreeItemButton
              nodeId={`reels-${film.id}`}
              label="Reels"
              icon={<VideoLibraryIcon />}
              isSelected={selectedNode === `reels-${film.id}`}
              onSelect={onNodeSelect}
              hasChildren={Boolean((reels[film.id]?.length ?? 0) > 0)}
            >
              {(reels[film.id] ?? []).map((reel) => (
                <TreeItemButton
                  key={reel.id}
                  nodeId={`reel-${film.id}-${reel.id}`}
                  label={`${reel.id} (${reel.frameCount}f)`}
                  icon={<PlayCircleIcon sx={{ fontSize: '1rem' }} />}
                  isSelected={selectedNode === `reel-${film.id}-${reel.id}`}
                  onSelect={onNodeSelect}
                />
              ))}
            </TreeItemButton>
          </TreeItemButton>
        ))}
      </Stack>
    </Paper>
  );
};
