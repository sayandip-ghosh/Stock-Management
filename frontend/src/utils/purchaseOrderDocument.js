import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

export const generatePurchaseOrderDocument = async (purchaseOrderData) => {
  try {
    console.log('Generating Word document for PO:', purchaseOrderData);

    // Create the document
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "heading",
            name: "Heading",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 28,
              bold: true,
              color: "000000",
            },
            paragraph: {
              spacing: {
                after: 120,
              },
            },
          },
          {
            id: "subheading",
            name: "Subheading",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 22,
              bold: true,
              color: "000000",
            },
            paragraph: {
              spacing: {
                after: 120,
              },
            },
          },
        ],
      },
      sections: [
        {
          properties: {},
          children: [
            // Company Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "STOCK MANAGEMENT COMPANY",
                  bold: true,
                  size: 32,
                  color: "2B6CB0",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 300,
              },
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: "Purchase Order",
                  bold: true,
                  size: 28,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
              },
            }),

            // Purchase Order Details Table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Purchase Order Number:",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                      width: {
                        size: 40,
                        type: WidthType.PERCENTAGE,
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: purchaseOrderData.order_number || "PO-PENDING",
                            }),
                          ],
                        }),
                      ],
                      width: {
                        size: 60,
                        type: WidthType.PERCENTAGE,
                      },
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Supplier Name:",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: purchaseOrderData.supplier_name || "",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Supplier Contact:",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: purchaseOrderData.supplier_contact || "N/A",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Order Date:",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: new Date(purchaseOrderData.order_date).toLocaleDateString() || "",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Expected Delivery Date:",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: purchaseOrderData.expected_delivery_date 
                                ? new Date(purchaseOrderData.expected_delivery_date).toLocaleDateString() 
                                : "TBD",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
              borders: {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                left: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                right: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                insideHorizontal: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                insideVertical: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
              },
            }),

            // Spacing
            new Paragraph({
              children: [new TextRun("")],
              spacing: {
                after: 300,
              },
            }),

            // Items Table Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "Order Items:",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: {
                after: 200,
              },
            }),

            // Items Table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                // Header Row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Part Name",
                              bold: true,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: {
                        size: 40,
                        type: WidthType.PERCENTAGE,
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Quantity",
                              bold: true,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: {
                        size: 20,
                        type: WidthType.PERCENTAGE,
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Unit",
                              bold: true,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: {
                        size: 20,
                        type: WidthType.PERCENTAGE,
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Cost / Unit",
                              bold: true,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: {
                        size: 20,
                        type: WidthType.PERCENTAGE,
                      },
                    }),
                  ],
                }),
                // Data Rows
                ...(purchaseOrderData.items || []).map(item => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: item.part_name || "Unknown Part",
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: (item.quantity_ordered || 0).toString(),
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: item.unit || "pcs",
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `₹${(item.cost_per_unit_input || 0).toFixed(2)} / ${item.cost_unit_type || 'piece'}`,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                      }),
                    ],
                  })
                ),
                // Total Row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "TOTAL AMOUNT:",
                              bold: true,
                            }),
                          ],
                          alignment: AlignmentType.RIGHT,
                        }),
                      ],
                      columnSpan: 3,
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `₹${(purchaseOrderData.total_amount || 0).toFixed(2)}`,
                              bold: true,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
              borders: {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                left: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                right: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                insideHorizontal: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
                insideVertical: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                },
              },
            }),

            // Notes Section
            ...(purchaseOrderData.notes ? [
              new Paragraph({
                children: [new TextRun("")],
                spacing: {
                  after: 300,
                },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Notes:",
                    bold: true,
                    size: 20,
                  }),
                ],
                spacing: {
                  after: 120,
                },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: purchaseOrderData.notes,
                  }),
                ],
                spacing: {
                  after: 300,
                },
              }),
            ] : []),

            // Footer
            new Paragraph({
              children: [new TextRun("")],
              spacing: {
                after: 400,
              },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "This is an automatically generated purchase order.",
                  italics: true,
                  size: 18,
                  color: "666666",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });

    // Generate and download the document using browser-compatible method
    const blob = await Packer.toBlob(doc);
    
    const fileName = `PurchaseOrder_${purchaseOrderData.order_number || 'PENDING'}_${new Date().toISOString().split('T')[0]}.docx`;
    saveAs(blob, fileName);
    
    console.log('Word document generated and downloaded successfully:', fileName);
    return true;
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw error;
  }
};
