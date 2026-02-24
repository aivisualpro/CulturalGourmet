interface PageHeaderState {
  title: string
  description?: string
  icon?: string
}

const headerState = reactive<PageHeaderState>({
  title: '',
  description: '',
  icon: '',
})

/** Teleport target ID for page-specific header actions */
export const HEADER_ACTIONS_ID = 'header-actions'

export function usePageHeader() {
  function setHeader(opts: PageHeaderState) {
    headerState.title = opts.title
    headerState.description = opts.description || ''
    headerState.icon = opts.icon || ''
  }

  function clearHeader() {
    headerState.title = ''
    headerState.description = ''
    headerState.icon = ''
  }

  return {
    headerState: readonly(headerState),
    setHeader,
    clearHeader,
    HEADER_ACTIONS_ID,
  }
}
