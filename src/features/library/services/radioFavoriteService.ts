import type {RadioStation} from '../../radio/domain/radioStation';
import {
  deleteRadioFavorite,
  saveRadioFavorite,
} from '../infrastructure/radioFavoriteRepository';

export function setRadioFavorite(
  station: RadioStation,
  shouldBeFavorite: boolean,
) {
  return shouldBeFavorite
    ? saveRadioFavorite(station)
    : deleteRadioFavorite(station.id);
}
