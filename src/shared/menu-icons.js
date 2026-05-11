import { ChefHat, Coffee, Drumstick, Fish, Flame, Leaf, Star, UtensilsCrossed } from 'lucide-react'

const menuCategoryIcons = [
  {
    value: 'chef-hat',
    label: 'Chef Hat',
    icon: ChefHat,
  },
  {
    value: 'utensils-crossed',
    label: 'Utensils',
    icon: UtensilsCrossed,
  },
  {
    value: 'drumstick',
    label: 'Drumstick',
    icon: Drumstick,
  },
  {
    value: 'fish',
    label: 'Fish',
    icon: Fish,
  },
  {
    value: 'leaf',
    label: 'Leaf',
    icon: Leaf,
  },
  {
    value: 'flame',
    label: 'Flame',
    icon: Flame,
  },
  {
    value: 'coffee',
    label: 'Coffee',
    icon: Coffee,
  },
  {
    value: 'star',
    label: 'Star',
    icon: Star,
  },
]

const menuCategoryIconMap = new Map(menuCategoryIcons.map((item) => [item.value, item.icon]))
const menuCategoryIconLabelMap = new Map(menuCategoryIcons.map((item) => [item.value, item.label]))

export const MENU_CATEGORY_ICON_OPTIONS = menuCategoryIcons
export const DEFAULT_MENU_CATEGORY_ICON = 'chef-hat'

export function getMenuCategoryIcon(iconKey) {
  return menuCategoryIconMap.get(iconKey) || ChefHat
}

export function getMenuCategoryIconLabel(iconKey) {
  return menuCategoryIconLabelMap.get(iconKey) || 'Chef Hat'
}
