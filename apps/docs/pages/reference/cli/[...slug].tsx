import { MenuId } from '~/components/Navigation/NavigationMenu/NavigationMenu'
import { NavMenuProvider } from '~/components/Navigation/NavigationMenu/NavigationMenuContext'
import RefSectionHandler from '~/components/reference/RefSectionHandler'
import { flattenSections } from '~/lib/helpers'
import handleRefGetStaticPaths from '~/lib/mdx/handleRefStaticPaths'
import handleRefStaticProps from '~/lib/mdx/handleRefStaticProps'

import spec from '~/spec/cli_v1_commands.yaml' assert { type: 'yml' }
import cliCommonSections from '~/spec/common-cli-sections.json' assert { type: 'json' }

const sections = flattenSections(cliCommonSections)
const libraryPath = '/cli'

export default function CliRef(props) {
  return (
    <NavMenuProvider menuId={MenuId.RefCli}>
      <RefSectionHandler sections={sections} spec={spec} pageProps={props} type="cli" />
    </NavMenuProvider>
  )
}

export async function getStaticProps() {
  return handleRefStaticProps(sections, libraryPath)
}

export async function getStaticPaths() {
  return handleRefGetStaticPaths(sections)
}
