import { prisma } from '@mzadat/db'
import { CURRENCY_CODE } from '@mzadat/config'

export async function TopProducts() {
  const products = await prisma.product.findMany({
    take: 5,
    orderBy: { price: 'desc' },
    select: {
      id: true,
      name: true,
      price: true,
      saleType: true,
      status: true,
    },
  })

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-[13px] font-semibold text-gray-900">Top Lots</h2>
      <div className="space-y-3">
        {products.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-gray-400">No lots yet</p>
        ) : (
          products.map((product, i) => (
            <div key={product.id} className="flex items-center gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-medium text-gray-500">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-gray-900">
                  {(product.name as Record<string, string>)?.en || 'Untitled'}
                </p>
                <p className="text-[11px] text-gray-400 capitalize">
                  {product.saleType.replace('_', ' ')} · {product.status}
                </p>
              </div>
              <span className="shrink-0 text-[13px] font-medium text-gray-900">
                {CURRENCY_CODE} {Number(product.price).toFixed(3)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
