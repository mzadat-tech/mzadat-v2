'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Save, User, Building2, Phone, MapPin, FileText, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@mzadat/ui/components/card'
import { Input } from '@mzadat/ui/components/input'
import { Label } from '@mzadat/ui/components/label'
import { Button } from '@mzadat/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@mzadat/ui/components/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzadat/ui/components/tabs'
import { Badge } from '@mzadat/ui/components/badge'
import { Separator } from '@mzadat/ui/components/separator'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import { toast } from 'sonner'

export default function ProfilePage() {
  const isAr = false
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSaving(false)
    toast.success(isAr ? 'تم حفظ البيانات بنجاح' : 'Profile saved successfully')
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold">{isAr ? 'الملف الشخصي' : 'Profile'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr ? 'إدارة معلوماتك الشخصية وإعدادات الحساب' : 'Manage your personal information and account settings'}
        </p>
      </motion.div>

      <Tabs defaultValue="personal" dir={isAr ? 'rtl' : 'ltr'}>
        <motion.div variants={fadeInUp}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              {isAr ? 'المعلومات الشخصية' : 'Personal Info'}
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-2">
              <Building2 className="h-4 w-4" />
              {isAr ? 'البيانات البنكية' : 'Bank Details'}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              {isAr ? 'الأمان' : 'Security'}
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="personal" className="mt-6 space-y-6">
          {/* Avatar */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary-100 text-xl text-primary-700">
                        MZ
                      </AvatarFallback>
                    </Avatar>
                    <button className="absolute -bottom-1 -end-1 rounded-full bg-primary-600 p-1.5 text-white shadow-lg transition-transform hover:scale-110">
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {isAr ? 'صورة الملف الشخصي' : 'Profile Picture'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isAr ? 'يجب أن تكون الصورة بحد أقصى 5 ميجابايت' : 'Max 5MB, JPG or PNG'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Personal Information Form */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isAr ? 'المعلومات الشخصية' : 'Personal Information'}
                </CardTitle>
                <CardDescription>
                  {isAr ? 'قم بتحديث بياناتك الشخصية' : 'Update your personal details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{isAr ? 'الاسم الأول' : 'First Name'}</Label>
                      <Input placeholder={isAr ? 'أدخل الاسم الأول' : 'Enter first name'} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'اسم العائلة' : 'Last Name'}</Label>
                      <Input placeholder={isAr ? 'أدخل اسم العائلة' : 'Enter last name'} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                      <Input type="email" placeholder="email@example.com" disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'رقم الهاتف' : 'Phone'}</Label>
                      <Input type="tel" placeholder="+968 xxxx xxxx" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'رقم الهوية' : 'ID Number'}</Label>
                      <Input placeholder={isAr ? 'رقم البطاقة الشخصية' : 'National ID'} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'المحافظة' : 'Governorate'}</Label>
                      <Input placeholder={isAr ? 'مسقط' : 'Muscat'} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isAr ? 'العنوان' : 'Address'}</Label>
                    <Input placeholder={isAr ? 'العنوان الكامل' : 'Full address'} />
                  </div>
                  <Separator />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving
                        ? isAr ? 'جاري الحفظ...' : 'Saving...'
                        : isAr ? 'حفظ التغييرات' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Documents */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {isAr ? 'الوثائق' : 'Documents'}
                    </CardTitle>
                    <CardDescription>
                      {isAr ? 'المستندات المطلوبة للتحقق من الحساب' : 'Required documents for account verification'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    {isAr ? 'قيد المراجعة' : 'Under Review'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4">
                    <div className="rounded-lg bg-blue-50 p-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{isAr ? 'البطاقة الشخصية' : 'National ID'}</p>
                      <p className="text-xs text-muted-foreground">{isAr ? 'الأمامية والخلفية' : 'Front & Back'}</p>
                    </div>
                    <Button variant="outline" size="sm" className="ms-auto text-xs">
                      {isAr ? 'رفع' : 'Upload'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{isAr ? 'إثبات العنوان' : 'Proof of Address'}</p>
                      <p className="text-xs text-muted-foreground">{isAr ? 'فاتورة خدمات حديثة' : 'Recent utility bill'}</p>
                    </div>
                    <Button variant="outline" size="sm" className="ms-auto text-xs">
                      {isAr ? 'رفع' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="bank" className="mt-6 space-y-6">
          <motion.div variants={fadeInUp} initial="initial" animate="animate">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isAr ? 'البيانات البنكية' : 'Bank Details'}
                </CardTitle>
                <CardDescription>
                  {isAr ? 'بيانات الحساب البنكي لاسترداد المبالغ' : 'Bank account for refunds and withdrawals'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{isAr ? 'اسم البنك' : 'Bank Name'}</Label>
                      <Input placeholder={isAr ? 'بنك مسقط' : 'Bank Muscat'} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'اسم صاحب الحساب' : 'Account Holder'}</Label>
                      <Input placeholder={isAr ? 'الاسم كما في البنك' : 'Name as in bank'} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'رقم الحساب' : 'Account Number'}</Label>
                      <Input placeholder="xxxx xxxx xxxx" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label>IBAN</Label>
                      <Input placeholder="OM xx xxxx xxxx xxxx xxxx" dir="ltr" />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving
                        ? isAr ? 'جاري الحفظ...' : 'Saving...'
                        : isAr ? 'حفظ البيانات البنكية' : 'Save Bank Details'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <motion.div variants={fadeInUp} initial="initial" animate="animate">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{isAr ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
                      <Input type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                      <Input type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                      <Input type="password" />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="gap-2">
                      <Shield className="h-4 w-4" />
                      {saving
                        ? isAr ? 'جاري التحديث...' : 'Updating...'
                        : isAr ? 'تحديث كلمة المرور' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
