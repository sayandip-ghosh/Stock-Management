import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  ImageRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  HeadingLevel,
} from "docx";
import { saveAs } from "file-saver";

// Helper function to convert image to buffer
const imageToBuffer = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
};

export const generatePurchaseOrderDocument = async (purchaseOrderData) => {
  try {
    console.log("Generating Word document for PO:", purchaseOrderData);

    // Load images from public folder
    const leftLogoBuffer = await imageToBuffer("/Picture1.jpg");
    const rightLogoBuffer = await imageToBuffer("/Picture2.png");

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
          properties: {
            page: {
              margin: {
                top: 720, // 1 inch
                right: 700, // 0.5 inch
                bottom: 700, // 1 inch
                left: 700, // 0.5 inch
              },
            },
          },
          children: [
            // Company Logo and Header
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: leftLogoBuffer
                            ? [
                                new ImageRun({
                                  data: leftLogoBuffer,
                                  transformation: {
                                    width: 112,
                                    height: 64,
                                  },
                                }),
                              ]
                            : [
                                new TextRun({
                                  text:
                                    purchaseOrderData.company?.logoText ||
                                    "ISO LOGO",
                                  bold: true,
                                  size: 20,
                                  color: "0066CC",
                                }),
                              ],
                          alignment: AlignmentType.LEFT,
                        }),
                        // Add ISO certification text below image
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "ISO 9001:2015",
                              bold: true,
                              size: 16,
                              color: "000080",
                            }),
                          ],
                          alignment: AlignmentType.CENTER, // center under the image
                          spacing: { before: 100 }, // adds a little space above text
                        }),
                      ],
                      width: { size: 10, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "", size: 10 })],
                          spacing: { before: 100, after: 100 }, // empty spacer line
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text:
                                purchaseOrderData.company?.name ||
                                "TRANSELECTRICALS",
                              bold: false,
                              size: 56,
                              color: "000080",
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text:
                                purchaseOrderData.company?.address ||
                                "HO: 56E, Hemanta Basu Sarani, Stephen House, 4th Floor Room No.56B Kolkata-700001.",
                              size: 24,
                              color: "000080",
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `WORKS: ${
                                purchaseOrderData.company?.worksAddress ||
                                "300, Rai Bahadur Road, Kolkata-700053"
                              }`,
                              size: 24,
                              color: "000080",
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `MOB: ${
                                purchaseOrderData.company?.mobile ||
                                "9433758747/8336913004"
                              } email id: ${
                                purchaseOrderData.company?.email ||
                                "transkolkata29@gmail.com"
                              }`,
                              size: 24,
                              color: "000080",
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `GST: ${
                                purchaseOrderData.company?.gst ||
                                "19AABFT5467H1ZU"
                              }`,
                              size: 24,
                              color: "000080",
                              bold: true,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Our sister concerns: A) Eastern Regional Foundry (for OHE fitting CORE Approved).",
                              size: 20,
                              italics: true,
                              color: "CC0000",
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "B) Lawrence Enterprises (For G.I and S.S fasteners non CORE/RDSO)",
                              size: 20,
                              italics: true,
                              color: "CC0000",
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 80, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: rightLogoBuffer
                            ? [
                                new ImageRun({
                                  data: rightLogoBuffer,
                                  transformation: {
                                    width: 78,
                                    height: 65,
                                  },
                                }),
                              ]
                            : [
                                new TextRun({
                                  text:
                                    purchaseOrderData.company?.rightLogo ||
                                    "TE LOGO",
                                  bold: true,
                                  size: 20,
                                  color: "0066CC",
                                }),
                              ],
                          alignment: AlignmentType.RIGHT,
                        }),
                      ],
                      width: { size: 10, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                      },
                    }),
                  ],
                }),
              ],
            }),

            // Purchase Order Title
            new Paragraph({
              children: [
                new TextRun({
                  text: "PURCHASE ORDER",
                  bold: true,
                  size: 24,
                  
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            }),

            // PO Number and Date Section
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `No. ${
                                purchaseOrderData.order_number ||
                                "TE/PO/RIL/25-26/07/04/HO"
                              }`,
                              bold: true,
                              size: 20,
                            }),
                          ],
                        }),
                      ],
                      width: { size: 86, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `Date: ${
                                purchaseOrderData.order_date
                                  ? new Date(
                                      purchaseOrderData.order_date
                                    ).toLocaleDateString("en-GB")
                                  : new Date().toLocaleDateString("en-GB")
                              }`,
                              bold: true,
                              size: 20,
                            }),
                          ],
                          alignment: AlignmentType.RIGHT, // will stick to right edge
                        }),
                      ],
                      width: { size: 14, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
            }),

            // Supplier Information
            new Paragraph({
              children: [
                new TextRun({
                  text: "To,",
                  bold: true,
                  size: 22,
                }),
              ],
              spacing: { before: 400, after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: purchaseOrderData.supplier_name || "Supplier Name",
                  bold: true,
                  size: 22,
                }),
              ],
              spacing: { after: 100 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text:
                    purchaseOrderData.supplier_address || "Supplier Address",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Email: ${
                    purchaseOrderData.supplier_email || "supplier@email.com"
                  }`,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `M: ${
                    purchaseOrderData.supplier_contact || "+91-XXXXXXXXXX"
                  }`,
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),

            // Kind Attention
            new Paragraph({
              children: [
                new TextRun({
                  text: `Kind attention: ${
                    purchaseOrderData.attention_person || "Mr Sahil Sheikh"
                  }`,
                  bold: true,
                  size: 20,
                  
                }),
              ],
              spacing: { after: 200 },
              alignment: AlignmentType.CENTER,
            }),

            // Subject
            new Paragraph({
              children: [
                new TextRun({
                  text: `Sub: Purchase order for ${
                    purchaseOrderData.subject
                  }`,
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),

            // Dear Sir
            new Paragraph({
              children: [
                new TextRun({
                  text: "Dear Sir,",
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),

            // Main content
            new Paragraph({
              children: [
                new TextRun({
                  text: `We would like to place the order for the following ${
                    purchaseOrderData.product_type
                  }`,
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),

            // Items Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                insideHorizontal: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: "000000",
                },
                insideVertical: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: "000000",
                },
              },
              rows: [
                // Header Row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Sl.No.", bold: true, size: 22 }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 8, type: WidthType.PERCENTAGE },
                      borders: {
                        top: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        bottom: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        left: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        right: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Item Description",
                              bold: true,
                              size: 22,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 52, type: WidthType.PERCENTAGE },
                      borders: {
                        top: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        bottom: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        left: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        right: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Qty", bold: true, size: 22 }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 10, type: WidthType.PERCENTAGE },
                      borders: {
                        top: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        bottom: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        left: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        right: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Rate", bold: true, size: 22 }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      borders: {
                        top: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        bottom: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        left: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        right: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Remarks",
                              bold: true,
                              size: 22,
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      borders: {
                        top: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        bottom: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        left: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        right: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                      },
                    }),
                  ],
                }),
                // Data Rows
                ...(purchaseOrderData.items || []).map(
                  (item, index) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: (index + 1).toString(),
                                  size: 20,
                                }),
                              ],
                              alignment: AlignmentType.CENTER,
                            }),
                          ],
                          borders: {
                            top: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            bottom: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            left: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            right: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                          },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text:
                                    item.description ||
                                    `${item.part_name || "Unknown Part"}`,
                                  size: 20,
                                }),
                              ],
                            }),
                          ],
                          borders: {
                            top: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            bottom: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            left: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            right: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                          },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: `${item.quantity_ordered || 0} ${
                                    item.unit || "nos"
                                  }`,
                                  size: 20,
                                }),
                              ],
                              alignment: AlignmentType.CENTER,
                            }),
                          ],
                          borders: {
                            top: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            bottom: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            left: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            right: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                          },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: `₹${(
                                    item.cost_per_unit_input || 0
                                  ).toFixed(2)}/${item.cost_unit_type}`,
                                  size: 20,
                                }),
                              ],
                              alignment: AlignmentType.CENTER,
                            }),
                          ],
                          borders: {
                            top: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            bottom: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            left: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            right: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                          },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: item.notes || " ",
                                  size: 16,
                                }),
                              ],
                            }),
                          ],
                          borders: {
                            top: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            bottom: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            left: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                            right: {
                              style: BorderStyle.SINGLE,
                              size: 4,
                              color: "000000",
                            },
                          },
                        }),
                      ],
                    })
                ),
              ],
            }),

            // Terms and Conditions
            new Paragraph({
              children: [
                new TextRun({
                  text: "Terms and Conditions:",
                  bold: true,
                  size: 22,
                  underline: {},
                }),
              ],
              spacing: { before: 100, after: 50 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Payment: ${
                    purchaseOrderData.payment_terms
                  }`,
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 50 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Tax: ${
                    purchaseOrderData.tax_terms || "GST@extra 18%"
                  }`,
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 50 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Delivery: ${
                    purchaseOrderData.delivery_terms
                  }`,
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 50 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Freight: ${
                    purchaseOrderData.freight_terms
                  }`,
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 50 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Transportation: ${
                    purchaseOrderData.transportation_terms ||
                    "The items shall be dispatched with the following way."
                  }`,
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 50 },
            }),

            // Transport Details Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                insideHorizontal: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: "000000",
                },
                insideVertical: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: "000000",
                },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "1)Transelectricals Billing Address:",
                              bold: true,
                              size: 20,
                              underline: {},
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "M/s Transelectricals",
                              bold: false,
                              size: 20,
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text:
                                purchaseOrderData.billing_address ||
                                "ROOM NO. 56B, 4THFLOOR",
                              size: 20,
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text:
                                purchaseOrderData.billing_address2 ||
                                "56E,HEMANTA BASU SARANI",
                              size: 20,
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text:
                                purchaseOrderData.billing_city ||
                                "STEPHEN HOUSE,KOLKATA-700001",
                              size: 20,
                            }),
                          ],
                        }),
                      ],
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        bottom: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        left: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        right: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        indent: { left: 100 },
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "2)Consignee&DeliveryAddress:-",
                              bold: true,
                              size: 20,
                              underline: {},
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "M/s Transelectricals",
                              bold: false,
                              size: 20,
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text:
                                purchaseOrderData.delivery_address ||
                                "300,RoyBahadurRoad",
                              size: 20,
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text:
                                purchaseOrderData.delivery_city ||
                                "Behala,Kolkata-700053",
                              size: 20,
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `Contact:${
                                purchaseOrderData.delivery_contact ||
                                "Mr.TilakDhar 8336069723"
                              }`,
                              size: 20,
                            }),
                          ],
                        }),
                      ],
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        bottom: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        left: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        right: {
                          style: BorderStyle.SINGLE,
                          size: 4,
                          color: "000000",
                        },
                        indent: { left: 100 },
                      },
                    }),
                  ],
                }),
              ],
            }),

            // Footer note
            new Paragraph({
              children: [
                new TextRun({
                  text: "For arranging transport and waybill, kindly Contact:-Mr. D. Chakraborty (MobNo.09433758747) Transport Head All Original Bill Copy, Certificates, Invoice ,Challan, Packing List etc. may kindly be send to our regd. Office address mentioned in the letterhead. Kindly send us an acknowledge email of this purchase order",
                  size: 20,
                }),
              ],
              spacing: { before: 100, after: 100 },
            }),

            // Signature
            new Paragraph({
              children: [
                new TextRun({
                  text: "Thanking You,",
                  size: 20,
                }),
              ],
              spacing: { after: 300 },
            }),

            

            new Paragraph({
              children: [
                new TextRun({
                  text: purchaseOrderData.signature_name || "S.BOSE",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: purchaseOrderData.signature_id || "9831158888",
                  size: 20,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    purchaseOrderData.signature_designation ||
                    "For Transelectricals",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
          ],
        },
      ],
    });

    // Generate and download the document using browser-compatible method
    const blob = await Packer.toBlob(doc);

    const fileName = `PurchaseOrder_${
      purchaseOrderData.order_number || "PENDING"
    }_${new Date().toISOString().split("T")[0]}.docx`;
    saveAs(blob, fileName);

    console.log(
      "Word document generated and downloaded successfully:",
      fileName
    );
    return true;
  } catch (error) {
    console.error("Error generating Word document:", error);
    throw error;
  }
};
