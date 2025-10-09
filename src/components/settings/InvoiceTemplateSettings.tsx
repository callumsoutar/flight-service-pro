"use client";
import { useState, useEffect } from "react";
import { Save, X, Building2, FileText, MapPin, Hash, Phone, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useUpdateSetting } from "@/hooks/use-settings";
import { toast } from "sonner";

export default function InvoiceTemplateSettings() {
  const { getSettingValue, refetch } = useSettingsContext();
  const updateMutation = useUpdateSetting();

  // Get current values from settings
  const [formData, setFormData] = useState({
    school_name: "",
    billing_address: "",
    gst_number: "",
    contact_phone: "",
    contact_email: "",
    invoice_footer_message: "",
    payment_terms_message: "",
    default_invoice_due_days: 7,
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const school_name = getSettingValue<string>("general", "school_name", "");
    const billing_address = getSettingValue<string>("general", "billing_address", "");
    const gst_number = getSettingValue<string>("general", "gst_number", "");
    const contact_phone = getSettingValue<string>("general", "contact_phone", "");
    const contact_email = getSettingValue<string>("general", "contact_email", "");
    const invoice_footer_message = getSettingValue<string>("invoicing", "invoice_footer_message", "");
    const payment_terms_message = getSettingValue<string>("invoicing", "payment_terms_message", "");
    const default_invoice_due_days = getSettingValue<number>("invoicing", "default_invoice_due_days", 7);

    setFormData({
      school_name,
      billing_address,
      gst_number,
      contact_phone,
      contact_email,
      invoice_footer_message,
      payment_terms_message,
      default_invoice_due_days,
    });
  }, [getSettingValue]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Update general settings
      await Promise.all([
        updateMutation.mutateAsync({
          category: "general",
          key: "school_name",
          setting_value: formData.school_name,
        }),
        updateMutation.mutateAsync({
          category: "general",
          key: "billing_address",
          setting_value: formData.billing_address,
        }),
        updateMutation.mutateAsync({
          category: "general",
          key: "gst_number",
          setting_value: formData.gst_number,
        }),
        updateMutation.mutateAsync({
          category: "general",
          key: "contact_phone",
          setting_value: formData.contact_phone,
        }),
        updateMutation.mutateAsync({
          category: "general",
          key: "contact_email",
          setting_value: formData.contact_email,
        }),
        updateMutation.mutateAsync({
          category: "invoicing",
          key: "invoice_footer_message",
          setting_value: formData.invoice_footer_message,
        }),
        updateMutation.mutateAsync({
          category: "invoicing",
          key: "payment_terms_message",
          setting_value: formData.payment_terms_message,
        }),
        updateMutation.mutateAsync({
          category: "invoicing",
          key: "default_invoice_due_days",
          setting_value: formData.default_invoice_due_days,
        }),
      ]);

      refetch();
      setHasChanges(false);
      toast.success("Settings saved", {
        description: "Invoice template settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error", {
        description: "Failed to save invoice template settings. Please try again.",
      });
    }
  };

  const handleCancel = () => {
    // Reload settings from context
    const school_name = getSettingValue<string>("general", "school_name", "");
    const billing_address = getSettingValue<string>("general", "billing_address", "");
    const gst_number = getSettingValue<string>("general", "gst_number", "");
    const contact_phone = getSettingValue<string>("general", "contact_phone", "");
    const contact_email = getSettingValue<string>("general", "contact_email", "");
    const invoice_footer_message = getSettingValue<string>("invoicing", "invoice_footer_message", "");
    const payment_terms_message = getSettingValue<string>("invoicing", "payment_terms_message", "");
    const default_invoice_due_days = getSettingValue<number>("invoicing", "default_invoice_due_days", 7);

    setFormData({
      school_name,
      billing_address,
      gst_number,
      contact_phone,
      contact_email,
      invoice_footer_message,
      payment_terms_message,
      default_invoice_due_days,
    });
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Company Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            This information will be displayed on all invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school_name" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company Name
              </Label>
              <Input
                id="school_name"
                value={formData.school_name}
                onChange={(e) => handleInputChange("school_name", e.target.value)}
                placeholder="e.g., Kapiti Aero Club"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst_number" className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                GST/Tax Number
              </Label>
              <Input
                id="gst_number"
                value={formData.gst_number}
                onChange={(e) => handleInputChange("gst_number", e.target.value)}
                placeholder="e.g., 12-345-678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_invoice_due_days" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Default Due Days
              </Label>
              <Input
                id="default_invoice_due_days"
                type="number"
                min="1"
                max="365"
                value={formData.default_invoice_due_days}
                onChange={(e) => handleInputChange("default_invoice_due_days", parseInt(e.target.value) || 7)}
                placeholder="7"
              />
              <p className="text-xs text-muted-foreground">
                Days until payment due
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Billing Address
            </Label>
            <Textarea
              id="billing_address"
              value={formData.billing_address}
              onChange={(e) => handleInputChange("billing_address", e.target.value)}
              placeholder="e.g., 123 Main Street, Aviation Drive, Wellington"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                placeholder="e.g., 04 543 6483"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange("contact_email", e.target.value)}
                placeholder="e.g., info@flightschool.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Footer & Payment Terms Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Footer & Payment Terms
          </CardTitle>
          <CardDescription>
            Customize the footer message and payment terms displayed on invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_footer_message">
              Footer Message
            </Label>
            <Textarea
              id="invoice_footer_message"
              value={formData.invoice_footer_message}
              onChange={(e) => handleInputChange("invoice_footer_message", e.target.value)}
              placeholder="e.g., Thank you for choosing to train with us."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              This message will appear at the bottom of the invoice
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_terms_message">
              Payment Terms
            </Label>
            <Textarea
              id="payment_terms_message"
              value={formData.payment_terms_message}
              onChange={(e) => handleInputChange("payment_terms_message", e.target.value)}
              placeholder="e.g., Payment terms: within 7 days of receipt of this invoice."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Specify your payment terms and late payment policy
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 flex-1">
            You have unsaved changes
          </p>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

