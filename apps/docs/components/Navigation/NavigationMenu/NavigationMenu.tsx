import { memo } from 'react'

import NavigationMenuHome from './HomeMenu'
import { useNavMenu } from './NavigationMenuContext'
import NavigationMenuGuideList from './NavigationMenuGuideList'
import { type GuideRefItem } from './NavigationMenuGuideRef'
import NavigationMenuRefList from './NavigationMenuRefList'
import { type Menu, MenuId, menus } from './menus'

function getMenuById(id: MenuId) {
  return menus.find((menu) => menu.id === id) ?? menus.find((menu) => menu.id === MenuId.Home)
}

function getMenuElement(menu: Menu, refData?: Array<GuideRefItem>) {
  const menuType = menu.type
  switch (menuType) {
    case 'home':
      return <NavigationMenuHome />
    case 'guide':
      return <NavigationMenuGuideList id={menu.id} refData={refData} />
    case 'reference':
      return (
        <NavigationMenuRefList
          id={menu.id}
          basePath={menu.path}
          commonSectionsFile={menu.commonSectionsFile}
          specFile={menu.specFile}
        />
      )
    default:
      throw new Error(`Unknown menu type '${menuType}'`)
  }
}

const NavigationMenu = () => {
  const { menuId: level, refData } = useNavMenu()
  const menu = getMenuById(level)

  return getMenuElement(menu, refData)
}

export { MenuId, menus }
export default memo(NavigationMenu)
