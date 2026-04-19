import { Box, Button, Collapse, Paper, Stack } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionIcon from '@mui/icons-material/Description';
import HomeIcon from '@mui/icons-material/Home';
import MovieIcon from '@mui/icons-material/Movie';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { useEffect, useState } from 'react';

import type { Film, NavigationNode, Reel, UploadWitnessVideoResponse } from '../App.types';

type AppNavigationTreeProps = {
  films: Film[];
  reels: Record<string, Reel[]>;
  reelSequences: Record<string, Record<string, Reel[]>>;
  witnessVideos: Record<string, UploadWitnessVideoResponse[]>;
  selectedNode: NavigationNode | '';
  onNodeSelect: (node: NavigationNode) => void;
};

type TreeItemProps = {
  nodeId: NavigationNode;
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  isBranchSelected?: boolean;
  onSelect: (nodeId: NavigationNode) => void;
  children?: React.ReactNode;
  hasChildren?: boolean;
};

const TreeItemButton = ({ nodeId, label, icon, isSelected, isBranchSelected, onSelect, children, hasChildren }: TreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (hasChildren && isBranchSelected) {
      setIsExpanded(true);
    }
  }, [hasChildren, isBranchSelected]);

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
  reelSequences,
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
        minHeight: 0,
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
            isBranchSelected={
              selectedNode === `film-${film.id}` ||
              selectedNode.startsWith(`witnesses-${film.id}`) ||
              selectedNode.startsWith(`witness-${film.id}-`) ||
              selectedNode.startsWith(`witness-file-${film.id}::`) ||
              selectedNode.startsWith(`witness-sequences-${film.id}::`) ||
              selectedNode.startsWith(`witness-frames-${film.id}::`) ||
              selectedNode.startsWith(`reels-${film.id}`) ||
              selectedNode.startsWith(`reel-${film.id}-`)
            }
            onSelect={onNodeSelect}
            hasChildren
          >
            <TreeItemButton
              nodeId={`witnesses-${film.id}`}
              label="Witnesses"
              icon={<VideoLibraryIcon />}
              isSelected={selectedNode === `witnesses-${film.id}`}
              isBranchSelected={
                selectedNode === `witnesses-${film.id}` ||
                selectedNode.startsWith(`witness-${film.id}-`) ||
                selectedNode.startsWith(`witness-file-${film.id}::`) ||
                selectedNode.startsWith(`witness-sequences-${film.id}::`) ||
                selectedNode.startsWith(`witness-frames-${film.id}::`)
              }
              onSelect={onNodeSelect}
              hasChildren={Boolean((witnessVideos[film.id]?.length ?? 0) > 0)}
            >
              {(witnessVideos[film.id] ?? []).map((video) => {
                const witnessNodeId = `witness-${film.id}-${video.fileName}` as NavigationNode;
                const witnessFileNodeId = `witness-file-${film.id}::${video.fileName}` as NavigationNode;
                const witnessSequencesNodeId = `witness-sequences-${film.id}::${video.fileName}` as NavigationNode;
                const witnessFramesNodeId = `witness-frames-${film.id}::${video.fileName}` as NavigationNode;

                return (
                  <TreeItemButton
                    key={video.fileName}
                    nodeId={witnessNodeId}
                    label={video.fileName}
                    icon={<PlayCircleIcon sx={{ fontSize: '1rem' }} />}
                    isSelected={selectedNode === witnessNodeId}
                    isBranchSelected={
                      selectedNode === witnessNodeId ||
                      selectedNode === witnessFileNodeId ||
                      selectedNode === witnessSequencesNodeId ||
                      selectedNode === witnessFramesNodeId
                    }
                    onSelect={onNodeSelect}
                    hasChildren
                  >
                    <TreeItemButton
                      nodeId={witnessFileNodeId}
                      label="File"
                      icon={<DescriptionIcon sx={{ fontSize: '1rem' }} />}
                      isSelected={selectedNode === witnessFileNodeId}
                      onSelect={onNodeSelect}
                    />

                    <TreeItemButton
                      nodeId={witnessSequencesNodeId}
                      label="Sequences"
                      icon={<VideoLibraryIcon sx={{ fontSize: '1rem' }} />}
                      isSelected={selectedNode === witnessSequencesNodeId}
                      onSelect={onNodeSelect}
                    />

                    <TreeItemButton
                      nodeId={witnessFramesNodeId}
                      label="Frames"
                      icon={<PhotoLibraryIcon sx={{ fontSize: '1rem' }} />}
                      isSelected={selectedNode === witnessFramesNodeId}
                      onSelect={onNodeSelect}
                    />
                  </TreeItemButton>
                );
              })}
            </TreeItemButton>

            <TreeItemButton
              nodeId={`reels-${film.id}`}
              label="Reels"
              icon={<VideoLibraryIcon />}
              isSelected={selectedNode === `reels-${film.id}`}
              isBranchSelected={
                selectedNode === `reels-${film.id}` ||
                selectedNode.startsWith(`reel-${film.id}-`) ||
                selectedNode.startsWith(`reel-file-${film.id}::`) ||
                selectedNode.startsWith(`reel-sequences-${film.id}::`) ||
                selectedNode.startsWith(`reel-sequence-${film.id}::`) ||
                selectedNode.startsWith(`reel-frames-${film.id}::`)
              }
              onSelect={onNodeSelect}
              hasChildren={Boolean((reels[film.id]?.length ?? 0) > 0)}
            >
              {(reels[film.id] ?? []).map((reel) => {
                const reelFileNodeId = `reel-file-${film.id}::${reel.id}` as NavigationNode;
                const reelSequencesNodeId = `reel-sequences-${film.id}::${reel.id}` as NavigationNode;
                const reelFramesNodeId = `reel-frames-${film.id}::${reel.id}` as NavigationNode;
                const matchingSequences = reelSequences[film.id]?.[reel.id] ?? [];

                return (
                  <TreeItemButton
                    key={reel.id}
                    nodeId={`reel-${film.id}-${reel.id}`}
                    label={`${reel.id} (${reel.frameCount}f)`}
                    icon={<PlayCircleIcon sx={{ fontSize: '1rem' }} />}
                    isSelected={selectedNode === `reel-${film.id}-${reel.id}`}
                    isBranchSelected={
                      selectedNode === `reel-${film.id}-${reel.id}` ||
                      selectedNode === reelFileNodeId ||
                      selectedNode === reelSequencesNodeId ||
                      selectedNode === reelFramesNodeId ||
                      selectedNode.startsWith(`reel-sequence-${film.id}::${reel.id}::`)
                    }
                    onSelect={onNodeSelect}
                    hasChildren
                  >
                    <TreeItemButton
                      nodeId={reelFileNodeId}
                      label={`Uploaded file: ${reel.sourceVideoName ?? 'Unavailable'}`}
                      icon={<DescriptionIcon sx={{ fontSize: '1rem' }} />}
                      isSelected={selectedNode === reelFileNodeId}
                      onSelect={onNodeSelect}
                    />

                    <TreeItemButton
                      nodeId={reelSequencesNodeId}
                      label="Sequences found from file"
                      icon={<VideoLibraryIcon sx={{ fontSize: '1rem' }} />}
                      isSelected={selectedNode === reelSequencesNodeId}
                      isBranchSelected={
                        selectedNode === reelSequencesNodeId ||
                        selectedNode.startsWith(`reel-sequence-${film.id}::${reel.id}::`)
                      }
                      onSelect={onNodeSelect}
                      hasChildren={matchingSequences.length > 0}
                    >
                      {matchingSequences.map((sequenceReel) => (
                        <TreeItemButton
                          key={sequenceReel.id}
                          nodeId={`reel-sequence-${film.id}::${reel.id}::${sequenceReel.id}` as NavigationNode}
                          label={`${sequenceReel.id} (${sequenceReel.frameCount}f)`}
                          icon={<PlayCircleIcon sx={{ fontSize: '1rem' }} />}
                          isSelected={selectedNode === (`reel-sequence-${film.id}::${reel.id}::${sequenceReel.id}` as NavigationNode)}
                          onSelect={onNodeSelect}
                        />
                      ))}
                    </TreeItemButton>

                    <TreeItemButton
                      nodeId={reelFramesNodeId}
                      label="Frames (all frames from the film)"
                      icon={<PhotoLibraryIcon sx={{ fontSize: '1rem' }} />}
                      isSelected={selectedNode === reelFramesNodeId}
                      onSelect={onNodeSelect}
                    />
                  </TreeItemButton>
                );
              })}
            </TreeItemButton>
          </TreeItemButton>
        ))}
      </Stack>
    </Paper>
  );
};
