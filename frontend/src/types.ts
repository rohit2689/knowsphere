export type User = { id: string; email: string }

export type Post = {
  id: string
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
  platform: string | null
  tags: string[]
  createdAt: string
}
