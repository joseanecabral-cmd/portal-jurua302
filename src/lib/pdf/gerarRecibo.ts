import type { Recibo } from '@/types'

function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function dataBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export async function gerarReciboPDF(recibo: Recibo): Promise<Blob> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = doc.internal.pageSize.getWidth()
  const M = 25
  const RX = W - M
  let y = 22

  // ── Cabeçalho ─────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('RECIBO DE LOCACAO', W / 2, y, { align: 'center' })
  y += 4

  doc.setLineWidth(0.6)
  doc.line(M, y + 1, RX, y + 1)
  y += 10

  // ── Competência / Data ────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Competencia: ' + recibo.competencia, M, y)
  y += 6
  doc.text('Data de pagamento: ' + dataBR(recibo.data_pagamento), M, y)
  y += 10

  doc.setLineWidth(0.2)
  doc.line(M, y, RX, y)
  y += 8

  // ── Locadora ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.text('Locadora:', M, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text('Ana Fernandes de Jesus Cabral', M, y)
  y += 10

  // ── Locatárias ────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.text('Locatarias:', M, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text('Juliana dos Santos', M, y)
  y += 5
  doc.text('Larissa Gabriela Duarte Teixeira', M, y)
  y += 10

  // ── Imóvel ────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.text('Imovel:', M, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text('Apartamento 302 - Edificio Jurua', M, y)
  y += 5
  doc.text('Rua Piratuba, 1580 - Bom Retiro', M, y)
  y += 5
  doc.text('Joinville/SC', M, y)
  y += 10

  doc.line(M, y, RX, y)
  y += 8

  // ── Discriminação dos valores ─────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.text('Discriminacao dos Valores:', M, y)
  y += 7

  const itens: [string, number][] = [
    ['Aluguel:', recibo.aluguel],
    ['Condominio:', recibo.condominio],
    ['IPTU:', recibo.iptu],
    ['Caucao:', recibo.caucao],
    ['Outros valores:', recibo.outros_valores],
  ]

  doc.setFont('helvetica', 'normal')
  for (const [label, valor] of itens) {
    doc.text(label, M, y)
    doc.text(brl(valor), RX, y, { align: 'right' })
    y += 6
  }

  y += 2
  doc.setLineWidth(0.4)
  doc.line(M, y, RX, y)
  y += 6

  // ── Total ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Total recebido:', M, y)
  doc.text(brl(recibo.total), RX, y, { align: 'right' })
  y += 12

  // ── Observações ───────────────────────────────────────────
  if (recibo.observacoes?.trim()) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setLineWidth(0.2)
    doc.line(M, y, RX, y)
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Observacoes:', M, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    const linhas = doc.splitTextToSize(recibo.observacoes, RX - M)
    doc.text(linhas, M, y)
    y += (linhas as string[]).length * 5 + 8
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setLineWidth(0.2)
  doc.line(M, y, RX, y)
  y += 10

  // ── Declaração ────────────────────────────────────────────
  const declaracao =
    'Declaro ter recebido das locatarias acima identificadas o valor total indicado neste recibo, ' +
    'referente a locacao do imovel descrito.'
  const declLinhas = doc.splitTextToSize(declaracao, RX - M)
  doc.text(declLinhas, M, y)
  y += (declLinhas as string[]).length * 5 + 14

  // ── Assinatura ────────────────────────────────────────────
  doc.text('Joinville/SC, ' + dataBR(recibo.data_pagamento), M, y)
  y += 16

  doc.setLineWidth(0.3)
  doc.line(M, y, M + 80, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.text('Ana Fernandes de Jesus Cabral', M, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text('Locadora', M, y)

  return doc.output('blob') as Blob
}
