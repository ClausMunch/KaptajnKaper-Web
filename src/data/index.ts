/**
 * Game Data Loaders
 * Load and type game configuration, enemies, map, and story data
 */

import gameConfig from './game-config.json'
import enemyData from './enemies.json'
import mapData from './map.json'
import storyData from './story.json'
import { expandedMap, expandedHarbors } from './expandedMap'

export type WorldMode = 'classic' | 'expanded'

export interface Harbor {
  id: number
  name: string
  position: { x: number; y: number }
  isCapital: boolean
  description: string
}

export interface Enemy {
  id: number
  name: string
  type: string
  cannons: number
  crew: number
  rigsdaler: number
  grain: number
  difficulty: number
  points: number
  description: string
}

export interface MapTile {
  x: number
  y: number
}

export const getHarbors = (mode: WorldMode = 'classic'): Harbor[] => mode === 'expanded'
  ? [...gameConfig.harbors.map(port => {
    const location = expandedMap.harborLocations.find(location => location.harborId === port.id)!
    return { ...port, position: { x: location.x, y: location.y } }
  }), ...expandedHarbors]
  : gameConfig.harbors as Harbor[]

export const getHarborById = (id: number): Harbor | undefined => {
  return gameConfig.harbors.find(port => port.id === id) ?? expandedHarbors.find(port => port.id === id)
}

export const getHarborByName = (name: string): Harbor | undefined => {
  return gameConfig.harbors.find(port => port.name === name) ?? expandedHarbors.find(port => port.name === name)
}

export const getEnemyTypes = (): Enemy[] => enemyData.enemyTypes as Enemy[]

export const getEnemyById = (id: number): Enemy | undefined => {
  return enemyData.enemyTypes.find((e) => (e as Enemy).id === id) as Enemy | undefined
}

export const getRandomEnemy = (): Enemy => {
  const enemies = getEnemyTypes()
  return enemies[Math.floor(Math.random() * enemies.length)]
}

export const getMapData = (mode: WorldMode = 'classic') => mode === 'expanded' ? expandedMap : mapData

export const getStoryData = () => storyData

export const getGameConfig = () => gameConfig

export default {
  getHarbors,
  getHarborById,
  getHarborByName,
  getEnemyTypes,
  getEnemyById,
  getRandomEnemy,
  getMapData,
  getStoryData,
  getGameConfig,
}
