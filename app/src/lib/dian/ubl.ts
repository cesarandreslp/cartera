type UblInvoiceInput = {
  number: string
  prefix: string
  consecutive: number
  cufe: string
  issueDate: Date
  issueTime: string
  environmentCode: '1' | '2'
  issuer: { nit: string; name: string; address: string; city: string; email: string; phone: string }
  receiver: { idType: string; id: string; name: string; address: string; city: string; email: string }
  lines: Array<{
    code: string
    description: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  subtotal: number
  discount: number
  taxAmount: number
  taxRate: number
  total: number
  currency: string
  notes?: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function m(n: number): string {
  return n.toFixed(2)
}

export function buildInvoiceUbl(x: UblInvoiceInput): string {
  const issueDate = x.issueDate.toISOString().slice(0, 10)

  const linesXml = x.lines.map((l, i) => `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="94">${m(l.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${x.currency}">${m(l.lineTotal)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${esc(l.description)}</cbc:Description>
      <cac:StandardItemIdentification>
        <cbc:ID>${esc(l.code)}</cbc:ID>
      </cac:StandardItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${x.currency}">${m(l.unitPrice)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="94">1.00</cbc:BaseQuantity>
    </cac:Price>
  </cac:InvoiceLine>`).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:InvoiceControl>
            <sts:InvoiceAuthorization>00000000000000</sts:InvoiceAuthorization>
            <sts:AuthorizationPeriod>
              <cbc:StartDate>${issueDate}</cbc:StartDate>
              <cbc:EndDate>${issueDate}</cbc:EndDate>
            </sts:AuthorizationPeriod>
            <sts:AuthorizedInvoices>
              <sts:Prefix>${esc(x.prefix)}</sts:Prefix>
              <sts:From>1</sts:From>
              <sts:To>999999999</sts:To>
            </sts:AuthorizedInvoices>
          </sts:InvoiceControl>
          <sts:InvoiceSource>
            <cbc:IdentificationCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe" listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.0">CO</cbc:IdentificationCode>
          </sts:InvoiceSource>
          <sts:SoftwareProvider>
            <sts:ProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="1" schemeName="31">${esc(x.issuer.nit)}</sts:ProviderID>
            <sts:SoftwareID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">GST-CARTERA-V6</sts:SoftwareID>
          </sts:SoftwareProvider>
          <sts:SoftwareSecurityCode schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">SIMULATED</sts:SoftwareSecurityCode>
          <sts:AuthorizationProvider>
            <sts:AuthorizationProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="4" schemeName="31">800197268</sts:AuthorizationProviderID>
          </sts:AuthorizationProvider>
          <sts:QRCode>NroFactura=${esc(x.number)}
NitFacturador=${esc(x.issuer.nit)}
NitAdquiriente=${esc(x.receiver.id)}
FechaFactura=${issueDate}
ValorTotalFactura=${m(x.total)}
CUFE=${x.cufe}</sts:QRCode>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ProfileExecutionID>${x.environmentCode}</cbc:ProfileExecutionID>
  <cbc:ID>${esc(x.number)}</cbc:ID>
  <cbc:UUID schemeID="${x.environmentCode}" schemeName="CUFE-SHA384">${x.cufe}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${x.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:Note>${esc(x.notes ?? '')}</cbc:Note>
  <cbc:DocumentCurrencyCode>${x.currency}</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(x.issuer.name)}</cbc:Name></cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:CityName>${esc(x.issuer.city)}</cbc:CityName>
          <cac:AddressLine><cbc:Line>${esc(x.issuer.address)}</cbc:Line></cac:AddressLine>
          <cac:Country><cbc:IdentificationCode>CO</cbc:IdentificationCode></cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${esc(x.issuer.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="1" schemeName="31">${esc(x.issuer.nit)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:Contact>
        <cbc:Telephone>${esc(x.issuer.phone)}</cbc:Telephone>
        <cbc:ElectronicMail>${esc(x.issuer.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(x.receiver.name)}</cbc:Name></cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:CityName>${esc(x.receiver.city)}</cbc:CityName>
          <cac:AddressLine><cbc:Line>${esc(x.receiver.address)}</cbc:Line></cac:AddressLine>
          <cac:Country><cbc:IdentificationCode>CO</cbc:IdentificationCode></cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${esc(x.receiver.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="${esc(x.receiver.idType)}" schemeName="${esc(x.receiver.idType)}">${esc(x.receiver.id)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:Contact>
        <cbc:ElectronicMail>${esc(x.receiver.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${x.currency}">${m(x.taxAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${x.currency}">${m(x.subtotal - x.discount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${x.currency}">${m(x.taxAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>${m(x.taxRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${x.currency}">${m(x.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${x.currency}">${m(x.subtotal - x.discount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${x.currency}">${m(x.total)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${x.currency}">${m(x.discount)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${x.currency}">${m(x.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</Invoice>`
}
