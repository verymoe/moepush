export interface TemplateField {
  key: string
  description?: string
  placeholder?: string
  required?: boolean
  component?: 'input' | 'textarea' | 'checkbox' | 'select' | 'hidden'
  defaultValue?: string
  options?: Array<{value: string, label: string}>
}

export interface MessageTemplate {
  type: string
  name: string
  description: string
  fields: TemplateField[]
}

export interface ChannelConfig {
  type: string
  label: string
  templates: MessageTemplate[]
}

export interface SendMessageOptions {
  webhook?: string
  secret?: string
  corpId?: string
  agentId?: string
  botToken?: string
  chatId?: string
  qqAppId?: string
  qqTargetType?: "group" | "user"
  qqOpenId?: string
  [key: string]: any
}

export class ChannelDeliveryError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message)
  }
}

export abstract class BaseChannel {
  abstract readonly config: ChannelConfig
  
  abstract sendMessage(message: any, options: SendMessageOptions): Promise<Response>
  
  getTemplates(): MessageTemplate[] {
    return this.config.templates
  }
  
  getLabel(): string {
    return this.config.label
  }
  
  getType(): string {
    return this.config.type
  }
}
