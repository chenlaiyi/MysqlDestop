import { Theme, SxProps } from '@mui/material/styles';

export const commonStyles = {
  panel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  } as SxProps<Theme>,

  toolbar: {
    px: 2,
    py: 1,
    borderBottom: 1,
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    gap: 1
  } as SxProps<Theme>,

  tableContainer: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto'
  } as SxProps<Theme>,

  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } as SxProps<Theme>,

  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  } as SxProps<Theme>,

  scrollable: {
    overflow: 'auto',
    '&::-webkit-scrollbar': { width: 6, height: 6 },
    '&::-webkit-scrollbar-thumb': { borderRadius: 3 }
  } as SxProps<Theme>
};
