/**
 * PDF Service — Generates compact, branded PDF receipts for auction registrations.
 *
 * Features:
 *  - Bilingual: English (LTR) and Arabic (RTL) with IBM Plex Sans Arabic font
 *  - Branded header with logo + footer (fixed position on every page)
 *  - Official company stamp
 *  - Compact layout with bold labels
 */

import PDFDocument from 'pdfkit'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { RegistrationDetail } from './registration.service.js'

// ── Asset paths ─────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ASSETS_DIR = join(__dirname, '..', 'imgs', 'reports')
const FONTS_DIR = join(__dirname, '..', 'fonts')
const ELEMENT_TOP = join(ASSETS_DIR, 'element-top.png')
const ELEMENT_BOTTOM = join(ASSETS_DIR, 'element-bottom.png')
const LOGO = join(ASSETS_DIR, 'logo-dark.png')
const STAMP = join(ASSETS_DIR, 'stamp.png')

// Font paths
const FONT_AR = join(FONTS_DIR, 'IBMPlexSansArabic-Regular.ttf')
const FONT_AR_BOLD = join(FONTS_DIR, 'IBMPlexSansArabic-Bold.ttf')
const FONT_EN = join(FONTS_DIR, 'IBMPlexSans-Regular.ttf')
const FONT_EN_BOLD = join(FONTS_DIR, 'IBMPlexSans-Bold.ttf')

function assetExists(path: string): boolean {
  return existsSync(path)
}

function getName(json: unknown, lang: string): string {
  if (typeof json === 'string') return json
  if (json && typeof json === 'object') {
    const obj = json as Record<string, string>
    return obj[lang] || obj.en || obj.ar || Object.values(obj)[0] || ''
  }
  return ''
}

// ── Main Service ───────────────────────────────────────

export const pdfService = {
  async generateRegistrationReceipt(
    registration: RegistrationDetail,
    lang: 'en' | 'ar' = 'en',
  ): Promise<Buffer> {
    const isAr = lang === 'ar'

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: isAr
            ? `إيصال التسجيل - ${registration.orderNumber}`
            : `Registration Receipt - ${registration.orderNumber}`,
          Author: 'Mzadat SPC',
          Subject: isAr ? 'إيصال تسجيل المزاد' : 'Auction Registration Receipt',
        },
      })

      // Register custom fonts
      if (assetExists(FONT_AR)) doc.registerFont('ar', FONT_AR)
      if (assetExists(FONT_AR_BOLD)) doc.registerFont('ar-bold', FONT_AR_BOLD)
      if (assetExists(FONT_EN)) doc.registerFont('en', FONT_EN)
      if (assetExists(FONT_EN_BOLD)) doc.registerFont('en-bold', FONT_EN_BOLD)

      const fontRegular = isAr ? 'ar' : 'en'
      const fontBold = isAr ? 'ar-bold' : 'en-bold'

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageW = doc.page.width   // 595.28
      const pageH = doc.page.height  // 841.89
      const margin = 40
      const contentW = pageW - margin * 2
      const footerZoneH = 70 // reserved for footer element + text

      // ── Helper: set font ────────────────────────────
      const setFont = (bold = false) => {
        doc.font(bold ? fontBold : fontRegular)
      }

      // ── Header Element ──────────────────────────────
      if (assetExists(ELEMENT_TOP)) {
        if (isAr) {
          doc.save()
          doc.translate(pageW, 0)
          doc.scale(-1, 1)
          doc.image(ELEMENT_TOP, 0, 0, { width: pageW, height: 60 })
          doc.restore()
        } else {
          doc.image(ELEMENT_TOP, 0, 0, { width: pageW, height: 60 })
        }
      }

      // ── Logo ────────────────────────────────────────
      const logoY = 20
      if (assetExists(LOGO)) {
        // Logo is 2239×1047, scale to ~120px wide
        const logoW = 120
        const logoH = (1047 / 2239) * logoW
        const logoX = isAr ? pageW - margin - logoW : margin
        doc.image(LOGO, logoX, logoY, { width: logoW, height: logoH })
      }

      // ── Title ───────────────────────────────────────
      const titleY = 80

      setFont(true)
      doc.fontSize(14).fillColor('#1a6cb5')
      doc.text(
        isAr ? 'إيصال تسجيل المزاد' : 'Auction Registration Receipt',
        margin, titleY,
        { align: 'center', width: contentW },
      )

      // ── Order No & Date (same line, compact) ────────
      let y = titleY + 24

      setFont()
      doc.fontSize(8).fillColor('#555')
      const orderDate = new Date(registration.createdAt).toLocaleDateString(
        isAr ? 'ar-OM' : 'en-GB',
        { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
      )

      if (isAr) {
        // Right-aligned: Order No on right, Date on left
        setFont(true)
        doc.text('رقم الطلب:', margin + contentW / 2, y, { align: 'right', width: contentW / 2, continued: false })
        setFont()
        doc.text(registration.orderNumber, margin + contentW / 2, y + 12, { align: 'right', width: contentW / 2 })

        setFont(true)
        doc.text('التاريخ:', margin, y, { width: contentW / 2 })
        setFont()
        doc.text(orderDate, margin, y + 12, { width: contentW / 2 })
      } else {
        setFont(true)
        doc.text('Order No: ', margin, y, { continued: true })
        setFont()
        doc.text(registration.orderNumber, { continued: false })

        setFont(true)
        doc.text('Date: ', margin + contentW / 2, y, { continued: true })
        setFont()
        doc.text(orderDate, { continued: false })
      }

      // ── Separator ──────────────────────────────────
      y += 30
      doc.moveTo(margin, y).lineTo(pageW - margin, y).strokeColor('#ddd').lineWidth(0.5).stroke()

      // ── Customer Details (compact: label + value on same line) ──
      y += 10
      setFont(true)
      doc.fontSize(10).fillColor('#082236')
      doc.text(isAr ? 'بيانات العميل' : 'Customer Details', margin, y, {
        align: isAr ? 'right' : 'left', width: contentW,
      })
      y += 16

      const custRows = [
        [isAr ? 'الاسم' : 'Name', registration.billingName || '-'],
        [isAr ? 'البريد الإلكتروني' : 'Email', registration.billingEmail || '-'],
        [isAr ? 'الهاتف' : 'Phone', registration.billingPhone || '-'],
      ]

      for (const [label, value] of custRows) {
        if (isAr) {
          setFont()
          doc.fontSize(8).fillColor('#444')
          doc.text(value, margin, y, { width: contentW * 0.6 })
          setFont(true)
          doc.text(label, margin + contentW * 0.6, y, { align: 'right', width: contentW * 0.4 })
        } else {
          setFont(true)
          doc.fontSize(8).fillColor('#444')
          doc.text(`${label}:`, margin, y, { continued: true, width: contentW })
          setFont()
          doc.text(`  ${value}`, { continued: false })
        }
        y += 14
      }

      // ── Auction Details Table ───────────────────────
      y += 8
      setFont(true)
      doc.fontSize(10).fillColor('#082236')
      doc.text(isAr ? 'تفاصيل المزاد' : 'Auction Details', margin, y, {
        align: isAr ? 'right' : 'left', width: contentW,
      })
      y += 16

      // Table header
      const tableH = 20
      doc.rect(margin, y, contentW, tableH).fill('#1a6cb5')
      setFont(true)
      doc.fontSize(8).fillColor('#fff')

      if (isAr) {
        doc.text('البيانات', margin + 8, y + 5, { width: contentW / 2 - 8 })
        doc.text('التفاصيل', margin + contentW / 2, y + 5, { align: 'right', width: contentW / 2 - 8 })
      } else {
        doc.text('Detail', margin + 8, y + 5, { width: contentW / 2 - 8 })
        doc.text('Value', margin + contentW / 2, y + 5, { width: contentW / 2 - 8 })
      }
      y += tableH

      // Table rows
      const groupName = getName(registration.groupName, lang)
      const tableRows = [
        [isAr ? 'اسم المجموعة' : 'Group', groupName],
        [isAr ? 'التاجر' : 'Merchant', registration.merchantName || '-'],
        [isAr ? 'عدد القطع' : 'Lots', String(registration.lotCount)],
        [isAr ? 'طريقة الدفع' : 'Payment', registration.isVipFree ? (isAr ? 'VIP (مجاني)' : 'VIP (Free)') : (isAr ? 'المحفظة' : 'Wallet')],
      ]

      let alternate = false
      for (const [label, value] of tableRows) {
        if (alternate) {
          doc.rect(margin, y, contentW, 18).fill('#f3f4f6')
        }
        setFont()
        doc.fillColor('#333').fontSize(8)

        if (isAr) {
          doc.text(value, margin + 8, y + 4, { width: contentW / 2 - 8 })
          setFont(true)
          doc.text(label, margin + contentW / 2, y + 4, { align: 'right', width: contentW / 2 - 8 })
        } else {
          setFont(true)
          doc.text(label, margin + 8, y + 4, { width: contentW / 2 - 8 })
          setFont()
          doc.text(value, margin + contentW / 2, y + 4, { width: contentW / 2 - 8 })
        }

        y += 18
        alternate = !alternate
      }

      // ── Lots listing (compact, comma-separated or multi-column) ──
      if (registration.lots.length > 0) {
        y += 8
        setFont(true)
        doc.fontSize(9).fillColor('#082236')
        doc.text(isAr ? 'القطع في هذه المجموعة:' : 'Lots in this group:', margin, y, {
          align: isAr ? 'right' : 'left', width: contentW,
        })
        y += 14

        setFont()
        doc.fontSize(7).fillColor('#666')
        for (const lot of registration.lots) {
          const lotName = getName(lot.name, lang)
          if (isAr) {
            doc.text(`${lotName}  •`, margin, y, { align: 'right', width: contentW })
          } else {
            doc.text(`•  ${lotName}`, margin + 8, y, { width: contentW - 8 })
          }
          y += 12
        }
      }

      // ── Cost Summary ────────────────────────────────
      y += 10
      setFont(true)
      doc.fontSize(10).fillColor('#082236')
      doc.text(isAr ? 'ملخص التكلفة' : 'Cost Summary', margin, y, {
        align: isAr ? 'right' : 'left', width: contentW,
      })
      y += 16

      const costRows: [string, string][] = [
        [isAr ? 'مبلغ التأمين' : 'Minimum Deposit', `OMR ${parseFloat(registration.depositAmount).toFixed(3)}`],
      ]

      if (registration.isVipFree) {
        costRows.push([isAr ? 'خصم VIP (100%)' : 'VIP Discount (100%)', `- OMR ${parseFloat(registration.discountAmount).toFixed(3)}`])
      }

      costRows.push([isAr ? 'الضريبة (5% شاملة)' : 'Tax (5% incl.)', `OMR ${parseFloat(registration.taxAmount).toFixed(3)}`])

      for (const [label, value] of costRows) {
        setFont()
        doc.fontSize(8).fillColor('#444')
        if (isAr) {
          doc.text(value, margin, y, { width: contentW / 2 })
          setFont(true)
          doc.text(label, margin + contentW / 2, y, { align: 'right', width: contentW / 2 })
        } else {
          setFont(true)
          doc.text(label, margin, y, { width: contentW / 2 })
          setFont()
          doc.text(value, margin + contentW / 2, y, { width: contentW / 2 })
        }
        y += 15
      }

      // Total row (highlighted)
      y += 4
      doc.rect(margin, y - 3, contentW, 22).fill('#eef6ff')
      setFont(true)
      doc.fontSize(10).fillColor('#1a6cb5')

      const totalLabel = isAr ? 'الإجمالي' : 'Total'
      const totalValue = `OMR ${parseFloat(registration.totalAmount).toFixed(3)}`

      if (isAr) {
        doc.text(totalValue, margin + 8, y, { width: contentW / 2 - 8 })
        doc.text(totalLabel, margin + contentW / 2, y, { align: 'right', width: contentW / 2 - 8 })
      } else {
        doc.text(totalLabel, margin + 8, y, { width: contentW / 2 - 8 })
        doc.text(totalValue, margin + contentW / 2, y, { width: contentW / 2 - 8 })
      }

      // ── Stamp ────────────────────────────────────────
      y += 40

      if (assetExists(STAMP)) {
        const stampX = isAr ? pageW - margin - 90 : margin
        const stampY = Math.min(y, pageH - footerZoneH - 120)
        doc.image(STAMP, stampX, stampY, { width: 90, height: 90 })
      }

      // ── VIP Badge ──────────────────────────────────
      if (registration.isVipFree) {
        const badgeX = isAr ? margin + 10 : pageW - margin - 110
        const badgeY = Math.min(y + 25, pageH - footerZoneH - 95)
        doc.save()
        doc.rect(badgeX, badgeY, 100, 24).fill('#f9395f')
        setFont(true)
        doc.fontSize(9).fillColor('#fff')
        doc.text(isAr ? '✦ عضو VIP' : '✦ VIP MEMBER', badgeX, badgeY + 7, { width: 100, align: 'center' })
        doc.restore()
      }

      // Transaction reference
      if (registration.walletTxRef) {
        const refY = Math.min(y + 100, pageH - footerZoneH - 20)
        setFont()
        doc.fontSize(7).fillColor('#999')
        doc.text(
          `${isAr ? 'مرجع المعاملة:' : 'Tx Ref:'} ${registration.walletTxRef}`,
          margin, refY,
          { align: isAr ? 'right' : 'left', width: contentW },
        )
      }

      // ── Footer (fixed position on every page) ──────
      const pages = doc.bufferedPageRange()
      for (let i = pages.start; i < pages.start + pages.count; i++) {
        doc.switchToPage(i)

        // Footer decorative element
        if (assetExists(ELEMENT_BOTTOM)) {
          if (isAr) {
            doc.save()
            doc.translate(pageW, 0)
            doc.scale(-1, 1)
            doc.image(ELEMENT_BOTTOM, 0, pageH - 55, { width: pageW, height: 55 })
            doc.restore()
          } else {
            doc.image(ELEMENT_BOTTOM, 0, pageH - 55, { width: pageW, height: 55 })
          }
        }

        // Footer text — always at fixed bottom position
        setFont()
        doc.fontSize(6).fillColor('#999')
        doc.text(
          'WWW.MZADAT.OM  |  SULTANATE OF OMAN, MUSCAT, SEEB  |  +968 7661 7644  |  INFO@MZADAT.OM',
          margin, pageH - 18,
          { align: 'center', width: contentW, lineBreak: false },
        )
      }

      doc.end()
    })
  },
}
