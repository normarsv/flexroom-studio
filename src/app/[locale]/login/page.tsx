import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <LoginForm locale={locale} />
    </div>
  )
}
