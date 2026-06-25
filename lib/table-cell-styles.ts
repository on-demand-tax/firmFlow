/** Use on wide data tables so column width constraints and wrapping behave predictably. */
export const dataTableClass = 'table-fixed w-full';

/** Tight columns (dates, amounts, badges) — stay on one line in table-fixed layout. */
export const tableCompactCell = 'w-px whitespace-nowrap';

/**
 * Long text columns. Includes md:whitespace-normal to override legacy TableCell nowrap
 * and min-w-0 so table-fixed columns can shrink when the viewport narrows.
 */
export const tableWrapCell =
  'min-w-0 max-w-[16rem] whitespace-normal break-words md:whitespace-normal';

export const tableWrapCellSm =
  'min-w-0 max-w-[14rem] whitespace-normal break-words text-sm md:whitespace-normal';
