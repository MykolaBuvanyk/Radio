export type RadioCatalogFilters = {
  countryCode: string;
  genre: string;
};

export type RadioFilterOption = {
  label: string;
  value: string;
};

export const defaultRadioCatalogFilters: RadioCatalogFilters = {
  countryCode: '',
  genre: '',
};

export const radioCountryOptions: readonly RadioFilterOption[] = [
  {label: 'All countries', value: ''},
  {label: 'Ukraine', value: 'UA'},
  {label: 'United States', value: 'US'},
  {label: 'United Kingdom', value: 'GB'},
  {label: 'Germany', value: 'DE'},
  {label: 'France', value: 'FR'},
];

export const radioGenreOptions: readonly RadioFilterOption[] = [
  {label: 'All genres', value: ''},
  {label: 'Music', value: 'music'},
  {label: 'News', value: 'news'},
  {label: 'Talk', value: 'talk'},
  {label: 'Rock', value: 'rock'},
  {label: 'Jazz', value: 'jazz'},
  {label: 'Electronic', value: 'electronic'},
];
