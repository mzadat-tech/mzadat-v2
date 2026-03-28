'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CLIENT_API_BASE } from '@/lib/api-base'

const API_BASE = CLIENT_API_BASE

interface RegistrationData {
  id: string
  orderNumber: string
  userId: string
  groupId: string
  groupName: unknown
  merchantId: string
  merchantName: string
  depositAmount: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  paymentMethod: string
  paymentStatus: string
  isVipFree: boolean
  billingName: string | null
  billingEmail: string | null
  billingPhone: string | null
  walletTxRef: string | null
  status: string
  lotCount: number
  lots: Array<{ id: string; name: unknown; slug: string; featureImage: string | null }>
  createdAt: string
}

function getName(json: unknown, lang: string): string {
  if (typeof json === 'string') return json
  if (json && typeof json === 'object') {
    const obj = json as Record<string, string>
    return obj[lang] || obj.en || obj.ar || Object.values(obj)[0] || ''
  }
  return ''
}

function fmt(amount: string): string {
  return `OMR ${parseFloat(amount).toFixed(3)}`
}

export default function ReceiptPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const lang = (searchParams.get('lang') as 'en' | 'ar') || 'en'
  const isAr = lang === 'ar'

  const receiptRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<RegistrationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'done'>('idle')

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setError('Not authenticated')
          return
        }
        const res = await fetch(`${API_BASE}/registrations/${encodeURIComponent(id)}/receipt`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error || `Error ${res.status}`)
          return
        }
        const body = await res.json()
        setData(body.data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchReceipt()
  }, [id])

  const generatePdf = useCallback(async () => {
    if (!receiptRef.current || pdfStatus === 'generating') return
    setPdfStatus('generating')
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])

      const el = receiptRef.current

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
      })

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)

      pdf.save(`receipt-${data?.orderNumber || id}-${lang}.pdf`)
      setPdfStatus('done')
    } catch (e) {
      console.error('PDF generation failed:', e)
      setError('Failed to generate PDF')
      setPdfStatus('idle')
    }
  }, [data, id, lang, pdfStatus])

  // Auto-generate PDF once data is rendered
  useEffect(() => {
    if (data && !loading && pdfStatus === 'idle') {
      const timer = setTimeout(() => generatePdf(), 500)
      return () => clearTimeout(timer)
    }
  }, [data, loading, pdfStatus, generatePdf])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">Loading receipt...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600 text-lg">{error || 'Receipt not found'}</p>
        <button onClick={() => window.close()} className="text-blue-600 underline">Close</button>
      </div>
    )
  }

  const orderDate = new Date(data.createdAt).toLocaleString(
    isAr ? 'ar-OM' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Muscat' },
  )
  const groupName = getName(data.groupName, lang)

  const costRows: [string, string][] = [
    [isAr ? 'مبلغ التأمين' : 'Minimum Deposit', fmt(data.depositAmount)],
  ]
  if (data.isVipFree) {
    costRows.push([isAr ? 'خصم VIP (100%)' : 'VIP Discount (100%)', `- ${fmt(data.discountAmount)}`])
  }
  costRows.push([isAr ? 'الضريبة (5% شاملة)' : 'Tax (5% incl.)', fmt(data.taxAmount)])

  return (
    <>
      {/* ── Overlay: PDF status ─────────────── */}
      {pdfStatus !== 'done' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.95)', gap: '12px',
        }}>
          <div className="animate-spin" style={{
            width: 32, height: 32, border: '4px solid #1a6cb5',
            borderTopColor: 'transparent', borderRadius: '50%',
          }} />
          <p style={{ color: '#555', fontSize: 14 }}>
            {pdfStatus === 'generating' ? (isAr ? 'جاري إنشاء PDF...' : 'Generating PDF...') : (isAr ? 'تحميل الإيصال...' : 'Loading receipt...')}
          </p>
        </div>
      )}

      {/* ── Done state ──────────────────────── */}
      {pdfStatus === 'done' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#fff', gap: '16px',
        }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <p style={{ color: '#333', fontSize: 16, fontWeight: 600 }}>
            {isAr ? 'تم تحميل الإيصال!' : 'Receipt downloaded!'}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => generatePdf()} style={{
              padding: '8px 24px', background: '#1a6cb5', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              {isAr ? 'تحميل مرة أخرى' : 'Download Again'}
            </button>
            <button onClick={() => window.close()} style={{
              padding: '8px 24px', background: '#fff', color: '#1a6cb5',
              border: '1px solid #1a6cb5', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* ── Hidden receipt HTML (for canvas capture) ─── */}
      <div
        ref={receiptRef}
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '794px',
          height: '1123px', // exact A4 ratio at 794px width
          overflow: 'hidden',
          fontFamily: isAr
            ? 'var(--font-arabic), "IBM Plex Sans Arabic", sans-serif'
            : 'var(--font-sans), "IBM Plex Sans", sans-serif',
          background: '#fff',
          color: '#333',
          fontSize: '10pt',
          lineHeight: '1.4',
        }}
      >
        {/* No padding on outer — decorative elements go full width */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header decorative element — full bleed */}
          <img
            src="/reports/element-top.png"
            alt=""
            style={{
              width: '100%', height: 'auto', display: 'block', flexShrink: 0,
              ...(isAr ? { transform: 'scaleX(-1)' } : {}),
            }}
          />

          {/* Content area with side padding */}
          <div style={{ padding: '0 56px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Logo */}
            <div style={{ marginTop: '12px', marginBottom: '6px' }}>
              <img src="/reports/logo-dark.png" alt="Mzadat" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
            </div>

            {/* Title */}
            <h1 style={{
              textAlign: 'center', color: '#1a6cb5', fontSize: '16pt',
              fontWeight: 700, margin: '8px 0 12px',
            }}>
              {isAr ? 'إيصال تسجيل المزاد' : 'Auction Registration Receipt'}
            </h1>

            {/* Order & Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, color: '#082236', fontSize: '9pt' }}>
                  {isAr ? 'رقم الطلب:' : 'Order No:'}
                </span>
                <span style={{ color: '#555', fontSize: '9pt' }}>{data.orderNumber}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, color: '#082236', fontSize: '9pt' }}>
                  {isAr ? 'التاريخ:' : 'Date:'}
                </span>
                <span style={{ color: '#555', fontSize: '9pt' }}>{orderDate}</span>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '6px 0 10px' }} />

            {/* Customer Details */}
            <h2 style={{ fontSize: '10pt', fontWeight: 700, color: '#082236', margin: '8px 0 6px' }}>
              {isAr ? 'بيانات العميل' : 'Customer Details'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '6px' }}>
              {([
                [isAr ? 'الاسم' : 'Name', data.billingName || '-'],
                [isAr ? 'البريد الإلكتروني' : 'Email', data.billingEmail || '-'],
                [isAr ? 'الهاتف' : 'Phone', data.billingPhone || '-'],
              ] as const).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: '12px', fontSize: '8.5pt' }}>
                  <span style={{ fontWeight: 700, color: '#444', minWidth: '90px' }}>{label}:</span>
                  <span style={{ color: '#555' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Auction Details */}
            <h2 style={{ fontSize: '10pt', fontWeight: 700, color: '#082236', margin: '8px 0 6px' }}>
              {isAr ? 'تفاصيل المزاد' : 'Auction Details'}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '8.5pt' }}>
              <thead>
                <tr>
                  <th style={{ background: '#1a6cb5', color: '#fff', fontWeight: 700, padding: '5px 10px', textAlign: isAr ? 'right' : 'left' }}>
                    {isAr ? 'التفاصيل' : 'Detail'}
                  </th>
                  <th style={{ background: '#1a6cb5', color: '#fff', fontWeight: 700, padding: '5px 10px', textAlign: isAr ? 'right' : 'left' }}>
                    {isAr ? 'البيانات' : 'Value'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {([
                  [isAr ? 'اسم المجموعة' : 'Group', groupName],
                  [isAr ? 'التاجر' : 'Merchant', data.merchantName || '-'],
                  [isAr ? 'عدد القطع' : 'Lots', String(data.lotCount)],
                  [isAr ? 'طريقة الدفع' : 'Payment', data.isVipFree ? (isAr ? 'VIP (مجاني)' : 'VIP (Free)') : (isAr ? 'المحفظة' : 'Wallet')],
                ] as const).map(([label, value], i) => (
                  <tr key={label} style={{ background: i % 2 === 1 ? '#f8f9fa' : '#fff' }}>
                    <td style={{ padding: '5px 10px', borderBottom: '1px solid #eee', fontWeight: 700, color: '#444', width: '35%' }}>{label}</td>
                    <td style={{ padding: '5px 10px', borderBottom: '1px solid #eee' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Lots */}
            {data.lots.length > 0 && (
              <div style={{ margin: '6px 0' }}>
                <h3 style={{ fontSize: '9pt', fontWeight: 700, color: '#082236', marginBottom: '3px' }}>
                  {isAr ? 'القطع في هذه المجموعة:' : 'Lots in this group:'}
                </h3>
                <ul style={{ paddingInlineStart: '18px', fontSize: '8pt', color: '#666', columns: 2, columnGap: '30px' }}>
                  {data.lots.map((lot) => (
                    <li key={lot.id} style={{ marginBottom: '2px' }}>{getName(lot.name, lang)}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cost Summary */}
            <h2 style={{ fontSize: '10pt', fontWeight: 700, color: '#082236', margin: '8px 0 6px' }}>
              {isAr ? 'ملخص التكلفة' : 'Cost Summary'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '6px' }}>
              {costRows.map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt' }}>
                  <span style={{ fontWeight: 700, color: '#444' }}>{label}</span>
                  <span style={{ color: '#555' }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              background: '#eef6ff', padding: '7px 10px', borderRadius: '4px', marginBottom: '12px',
            }}>
              <span style={{ fontSize: '10pt', fontWeight: 700, color: '#1a6cb5' }}>
                {isAr ? 'الإجمالي' : 'Total'}
              </span>
              <span style={{ fontSize: '10pt', fontWeight: 700, color: '#1a6cb5' }}>
                {fmt(data.totalAmount)}
              </span>
            </div>

            {/* Stamp + VIP */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
              <img src="/reports/stamp.png" alt="Stamp" style={{ width: '132px', height: '132px', objectFit: 'contain' }} />
              {data.isVipFree && (
                <div style={{
                  background: '#f9395f', color: '#fff', fontSize: '9pt',
                  fontWeight: 700, padding: '5px 14px', borderRadius: '4px',
                }}>
                  {isAr ? '✦ عضو VIP' : '✦ VIP MEMBER'}
                </div>
              )}
            </div>

            {/* Transaction ref */}
            {data.walletTxRef && (
              <p style={{ fontSize: '7.5pt', color: '#999', marginTop: '2px' }}>
                {isAr ? 'مرجع المعاملة:' : 'Tx Ref:'} {data.walletTxRef}
              </p>
            )}
          </div>
          {/* End content area */}

          {/* Footer — pinned to bottom */}
          <div style={{ marginTop: 'auto', flexShrink: 0 }}>
            <p style={{
              textAlign: 'center', fontSize: '6.5pt', color: '#999',
              letterSpacing: '0.3pt', padding: '3px 0 6px',
            }}>
              WWW.MZADAT.OM &nbsp;|&nbsp; SULTANATE OF OMAN, MUSCAT, SEEB &nbsp;|&nbsp; +968 7661 7644 &nbsp;|&nbsp; INFO@MZADAT.OM
            </p>
            <img
              src="/reports/element-bottom.png"
              alt=""
              style={{
                width: '100%', height: 'auto', display: 'block',
                ...(isAr ? { transform: 'scaleX(-1)' } : {}),
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
