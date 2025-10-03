// ... existing code ...

export interface StreamSource {
  available: boolean
  stream_url?: string
  embed?: string
  // <CHANGE> Add provider field to track which server/provider is being used
  provider?: string
  // </CHANGE>
}

// ... existing code ...
