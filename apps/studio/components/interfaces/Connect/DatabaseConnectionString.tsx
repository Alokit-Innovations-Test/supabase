import { useParams } from 'common'
import { getAddons } from 'components/interfaces/Billing/Subscription/Subscription.utils'
import { useProjectContext } from 'components/layouts/ProjectLayout/ProjectContext'
import AlertError from 'components/ui/AlertError'
import DatabaseSelector from 'components/ui/DatabaseSelector'
import Panel from 'components/ui/Panel'
import ShimmeringLoader from 'components/ui/ShimmeringLoader'
import { usePoolingConfigurationQuery } from 'data/database/pooling-configuration-query'
import { useReadReplicasQuery } from 'data/read-replicas/replicas-query'
import { useProjectAddonsQuery } from 'data/subscriptions/project-addons-query'
import { useSendEventMutation } from 'data/telemetry/send-event-mutation'
import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import { pluckObjectFields } from 'lib/helpers'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDatabaseSelectorStateSnapshot } from 'state/database-selector'
import { useDatabaseSettingsStateSnapshot } from 'state/database-settings'
import {
  CollapsibleContent_Shadcn_,
  CollapsibleTrigger_Shadcn_,
  Collapsible_Shadcn_,
  DIALOG_PADDING_X,
  SelectContent_Shadcn_,
  SelectItem_Shadcn_,
  SelectTrigger_Shadcn_,
  SelectValue_Shadcn_,
  Select_Shadcn_,
  Separator,
  TooltipContent_Shadcn_,
  TooltipTrigger_Shadcn_,
  Tooltip_Shadcn_,
  cn,
} from 'ui'
import { Input } from 'ui-patterns/DataInputs/Input'
import {
  DefaultSessionModeNotice,
  IPv4AddonDirectConnectionNotice,
  IPv4DeprecationNotice,
} from './DatabaseConnectionNotices'
import DatabaseSettings from './DatabaseSettings'
import {
  constructConnStringSyntax,
  getConnectionStrings,
  getPoolerTld,
} from './DatabaseSettings.utils'
import { UsePoolerCheckbox } from './UsePoolerCheckbox'
import { SessionIcon, TransactionIcon } from './pooler-icons'

const CONNECTION_TYPES = [
  { id: 'uri', label: 'URI' },
  { id: 'psql', label: 'PSQL' },
  { id: 'golang', label: 'Golang' },
  { id: 'jdbc', label: 'JDBC' },
  { id: 'dotnet', label: '.NET' },
  { id: 'nodejs', label: 'Node.js' },
  { id: 'php', label: 'PHP' },
  { id: 'python', label: 'Python' },
]

type ConnectionType = 'uri' | 'psql' | 'golang' | 'jdbc' | 'dotnet' | 'nodejs' | 'php' | 'python'

export const DatabaseConnectionString = () => {
  const project = useSelectedProject()
  const { ref: projectRef, connectionString } = useParams()
  const snap = useDatabaseSettingsStateSnapshot()
  const state = useDatabaseSelectorStateSnapshot()
  const { project: projectDetails, isLoading: isProjectLoading } = useProjectContext()

  const [poolingMode, setPoolingMode] = useState<'transaction' | 'session'>('transaction')
  const [selectedTab, setSelectedTab] = useState<ConnectionType>('uri')

  const { data: poolingInfo, isSuccess: isSuccessPoolingInfo } = usePoolingConfigurationQuery({
    projectRef,
  })
  const poolingConfiguration = poolingInfo?.find((x) => x.identifier === state.selectedDatabaseId)
  const defaultPoolingMode = poolingConfiguration?.pool_mode

  const {
    data: databases,
    error: readReplicasError,
    isLoading: isLoadingReadReplicas,
    isError: isErrorReadReplicas,
    isSuccess: isSuccessReadReplicas,
  } = useReadReplicasQuery({ projectRef })

  const selectedDatabase = (databases ?? []).find(
    (db) => db.identifier === state.selectedDatabaseId
  )

  const { data: addons, isSuccess: isSuccessAddons } = useProjectAddonsQuery({ projectRef })
  const { ipv4: ipv4Addon } = getAddons(addons?.selected_addons ?? [])

  const { mutate: sendEvent } = useSendEventMutation()

  const DB_FIELDS = ['db_host', 'db_name', 'db_port', 'db_user', 'inserted_at']
  const emptyState = { db_user: '', db_host: '', db_port: '', db_name: '' }
  const connectionInfo = pluckObjectFields(selectedDatabase || emptyState, DB_FIELDS)
  const connectionTld =
    projectDetails?.restUrl !== undefined
      ? new URL(projectDetails?.restUrl ?? '').hostname.split('.').pop() ?? 'co'
      : 'co'

  const handleCopy = (id: string) => {
    const labelValue = CONNECTION_TYPES.find((type) => type.id === id)?.label
    sendEvent({
      category: 'settings',
      action: 'copy_connection_string',
      label: labelValue ? labelValue : '',
    })
  }

  const connectionStrings =
    isSuccessPoolingInfo && poolingConfiguration !== undefined
      ? getConnectionStrings(connectionInfo, poolingConfiguration, {
          projectRef,
          // usePoolerConnection: snap.usePoolerConnection,
        })
      : {
          direct: {
            uri: '',
            psql: '',
            golang: '',
            jdbc: '',
            dotnet: '',
            nodejs: '',
            php: '',
            python: '',
          },
          pooler: {
            uri: '',
            psql: '',
            golang: '',
            jdbc: '',
            dotnet: '',
            nodejs: '',
            php: '',
            python: '',
          },
        }

  const poolerTld =
    isSuccessPoolingInfo && poolingConfiguration !== undefined
      ? getPoolerTld(poolingConfiguration?.connectionString)
      : 'com'
  const poolerConnStringSyntax =
    isSuccessPoolingInfo && poolingConfiguration !== undefined
      ? constructConnStringSyntax(poolingConfiguration?.connectionString, {
          selectedTab,
          usePoolerConnection: snap.usePoolerConnection,
          ref: projectRef as string,
          cloudProvider: isProjectLoading ? '' : project?.cloud_provider || '',
          region: isProjectLoading ? '' : project?.region || '',
          tld: snap.usePoolerConnection ? poolerTld : connectionTld,
          portNumber: snap.usePoolerConnection
            ? poolingMode === 'transaction'
              ? poolingConfiguration?.db_port.toString()
              : '5432'
            : connectionInfo.db_port.toString(),
        })
      : []

  useEffect(() => {
    if (poolingConfiguration?.pool_mode === 'session') {
      setPoolingMode(poolingConfiguration.pool_mode)
    }
  }, [poolingConfiguration?.pool_mode])

  return (
    <>
      <div className="m-7 p-3 border rounded flex items-center gap-10">
        <TransactionIcon />
        <SessionIcon />
      </div>
      <div className={cn('flex items-center gap-2', DIALOG_PADDING_X)}>
        <div className="flex">
          <span className="flex items-center text-foreground-lighter px-3 rounded-lg rounded-r-none text-xs border border-button border-r-0">
            Type
          </span>
          <Select_Shadcn_
            value={selectedTab}
            onValueChange={(connectionType: ConnectionType) => setSelectedTab(connectionType)}
          >
            <SelectTrigger_Shadcn_ size="small" className="w-auto rounded-l-none">
              <SelectValue_Shadcn_ className="[&_svg]:pl-2" />
            </SelectTrigger_Shadcn_>
            <SelectContent_Shadcn_>
              {CONNECTION_TYPES.map((type) => (
                <SelectItem_Shadcn_ key={type.id} value={type.id}>
                  {type.label}
                </SelectItem_Shadcn_>
              ))}
            </SelectContent_Shadcn_>
          </Select_Shadcn_>
        </div>
        <DatabaseSelector />
        {/* <DocsButton href="https://supabase.com/docs/guides/database/connecting-to-postgres" /> */}
      </div>
      <div className={cn(DIALOG_PADDING_X)}>
        {isLoadingReadReplicas && <ShimmeringLoader className="h-8 w-full" />}
        {isErrorReadReplicas && (
          <AlertError error={readReplicasError} subject="Failed to retrieve database settings" />
        )}
        {isSuccessReadReplicas && (
          <>
            <div className="flex flex-col gap-y-4 pt-2">
              <h1>Direct Connection</h1>
              <Input
                copy
                readOnly
                disabled
                className="input-mono [&>div>div>div>input]:text-xs [&>div>div>div>input]:opacity-100"
                value={connectionStrings['direct'][selectedTab]}
                onCopy={() => handleCopy(selectedTab)}
              />
            </div>
            <DatabaseSettings />
          </>
        )}
      </div>
      <Separator />
      <div className={cn(DIALOG_PADDING_X)}>
        {isLoadingReadReplicas && <ShimmeringLoader className="h-8 w-full" />}
        {isErrorReadReplicas && (
          <AlertError error={readReplicasError} subject="Failed to retrieve database settings" />
        )}
        {isSuccessReadReplicas && (
          <>
            <div className="flex flex-row gap-x-4">
              <div className="flex flex-col gap-y-4 pt-2">
                <h1>Transaction Pooler</h1>
                <Input
                  copy
                  readOnly
                  disabled
                  className="input-mono [&>div>div>div>input]:text-xs [&>div>div>div>input]:opacity-100"
                  value={connectionStrings['pooler'][selectedTab]}
                  onCopy={() => handleCopy(selectedTab)}
                />
                <DatabaseSettings />
              </div>
              <div className="flex flex-col gap-y-4 pt-2">
                <h1>Session Pooler</h1>
                <Input
                  copy
                  readOnly
                  disabled
                  className="input-mono [&>div>div>div>input]:text-xs [&>div>div>div>input]:opacity-100"
                  value={connectionStrings['pooler'][selectedTab].replace('6543', '5432')}
                  onCopy={() => handleCopy(selectedTab)}
                />
                <DatabaseSettings />
              </div>
            </div>
          </>
        )}
      </div>
      {poolerConnStringSyntax.length > 0 && (
        <>
          <Separator />
          <Panel.Content className={cn('!py-3 space-y-2')}>
            <Collapsible_Shadcn_>
              <CollapsibleTrigger_Shadcn_ className="group [&[data-state=open]>div>svg]:!-rotate-180">
                <div className="flex items-center gap-x-2 w-full">
                  <p className="text-xs text-foreground-light group-hover:text-foreground transition">
                    How to connect to a different database or switch to another user
                  </p>
                  <ChevronDown
                    className="transition-transform duration-200"
                    strokeWidth={1.5}
                    size={14}
                  />
                </div>
              </CollapsibleTrigger_Shadcn_>
              <CollapsibleContent_Shadcn_ className="my-2">
                <div className="text-foreground-light">
                  <p className="text-xs">
                    You can use the following URI format to switch to a different database or user
                    {snap.usePoolerConnection ? ' when using connection pooling' : ''}.
                  </p>
                  <p className="text-sm tracking-tight text-foreground-lighter">
                    {poolerConnStringSyntax.map((x, idx) => {
                      if (x.tooltip) {
                        return (
                          <Tooltip_Shadcn_ key={`syntax-${idx}`}>
                            <TooltipTrigger_Shadcn_ asChild>
                              <span className="text-foreground text-xs font-mono">{x.value}</span>
                            </TooltipTrigger_Shadcn_>
                            <TooltipContent_Shadcn_ side="bottom">
                              {x.tooltip}
                            </TooltipContent_Shadcn_>
                          </Tooltip_Shadcn_>
                        )
                      } else {
                        return (
                          <span key={`syntax-${idx}`} className="text-xs font-mono">
                            {x.value}
                          </span>
                        )
                      }
                    })}
                  </p>
                </div>
              </CollapsibleContent_Shadcn_>
            </Collapsible_Shadcn_>

            {selectedTab === 'python' && (
              <Collapsible_Shadcn_>
                <CollapsibleTrigger_Shadcn_ className="group [&[data-state=open]>div>svg]:!-rotate-180">
                  <div className="flex items-center gap-x-2 w-full">
                    <p className="text-xs text-foreground-light group-hover:text-foreground transition">
                      Connecting to SQL Alchemy
                    </p>
                    <ChevronDown
                      className="transition-transform duration-200"
                      strokeWidth={1.5}
                      size={14}
                    />
                  </div>
                </CollapsibleTrigger_Shadcn_>
                <CollapsibleContent_Shadcn_ className="my-2">
                  <div className="text-foreground-light text-xs grid gap-2">
                    <p>
                      Please use <code>postgresql://</code> instead of <code>postgres://</code> as
                      your dialect when connecting via SQLAlchemy.
                    </p>
                    <p>
                      Example:
                      <code>create_engine("postgresql+psycopg2://...")</code>
                    </p>
                    <p className="text-sm font-mono tracking-tight text-foreground-lighter"></p>
                  </div>
                </CollapsibleContent_Shadcn_>
              </Collapsible_Shadcn_>
            )}
          </Panel.Content>
          <Separator />
          <div className={cn(DIALOG_PADDING_X)}>
            <DatabaseSettings />
          </div>
        </>
      )}
    </>
  )
}
