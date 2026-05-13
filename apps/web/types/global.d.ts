/// <reference types="fabric" />

// Extend Fabric.js objects with SETT custom properties
declare module 'fabric' {
  interface Object {
    item_id?: string
    affiliate_url?: string
    merchant?: string
    price?: number
    product_name?: string
  }
}

// Next.js image types
declare module '*.png' {
  const content: string
  export default content
}

declare module '*.svg' {
  const content: string
  export default content
}
