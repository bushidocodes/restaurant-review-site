export interface CuisineAndNeighborhood {
  cuisine: string;
  neighborhood: string;
}

export const getSelectedCuisineAndNeighborhood = (): CuisineAndNeighborhood => {
  const cSelect = document.getElementById(
    "cuisines-select"
  ) as HTMLSelectElement;
  const nSelect = document.getElementById(
    "neighborhoods-select"
  ) as HTMLSelectElement;
  const cuisine = cSelect.options[cSelect.selectedIndex]?.value || "all";
  const neighborhood = nSelect.options[nSelect.selectedIndex]?.value || "all";
  return { cuisine, neighborhood };
};
