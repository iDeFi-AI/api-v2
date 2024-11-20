// utilities/colorMapping.ts

export const getColorForStatus = (status: 'PASS' | 'FAIL' | 'WARNING'): string => {
  switch (status) {
    case 'PASS':
      return 'green';
    case 'FAIL':
      return 'red';
    case 'WARNING':
      return 'yellow';
    default:
      return '';
  }
};
