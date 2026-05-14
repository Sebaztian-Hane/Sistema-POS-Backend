const generarComprobanteJson = ({ company, sale }) => {

  const fecha = new Date(sale.fechaEmision || sale.createdAt);

  const issueDate = fecha.toISOString().split('T')[0];

  const issueTime = fecha.toTimeString().split(' ')[0];

  const mapaTipoDocumento = {

    FACTURA: '01',

    BOLETA: '03',

    NOTA_CREDITO: '07'
  };

  const tipoDocSunat = mapaTipoDocumento[sale.tipoComprobante];

  const correlativoFormateado = String(sale.correlativo)
    .padStart(8, '0');

  const numeroComprobante =
    `${sale.serie}-${correlativoFormateado}`;

  const fileName =
    `${company.ruc}-${tipoDocSunat}-${sale.serie}-${correlativoFormateado}`;

  const clienteDocumento =
    sale.customer?.nroDocumento || '00000000';

  const clienteNombre =
    sale.customer?.razonSocial ||
    sale.customer?.nombre ||
    'CLIENTES VARIOS';

  const tipoDocumentoCliente = (() => {

    switch (sale.customer?.tipoDocumento) {

      case 'RUC':
        return '6';

      case 'DNI':
        return '1';

      case 'CE':
        return '4';

      case 'PASAPORTE':
        return '7';

      default:
        return '1';
    }
  })();

  const montoLetras =
    `${Number(sale.total).toFixed(2)} SOLES`;

  const invoiceLines = sale.items.map((item, index) => {

    return {

      "cbc:ID": {
        "_text": index + 1
      },

      "cbc:InvoicedQuantity": {
        "_attributes": {
          "unitCode": "NIU"
        },
        "_text": item.quantity
      },

      "cbc:LineExtensionAmount": {
        "_attributes": {
          "currencyID": sale.currency
        },
        "_text": Number(item.subtotal)
      },

      "cac:PricingReference": {

        "cac:AlternativeConditionPrice": {

          "cbc:PriceAmount": {
            "_attributes": {
              "currencyID": sale.currency
            },
            "_text": Number(item.precioSnapshot)
          },

          "cbc:PriceTypeCode": {
            "_text": "01"
          }
        }
      },

      "cac:TaxTotal": {

        "cbc:TaxAmount": {

          "_attributes": {
            "currencyID": sale.currency
          },

          "_text": Number(item.igv)
        },

        "cac:TaxSubtotal": [

          {

            "cbc:TaxableAmount": {

              "_attributes": {
                "currencyID": sale.currency
              },

              "_text": Number(item.subtotal)
            },

            "cbc:TaxAmount": {

              "_attributes": {
                "currencyID": sale.currency
              },

              "_text": Number(item.igv)
            },

            "cac:TaxCategory": {

              "cbc:Percent": {
                "_text": 18
              },

              "cbc:TaxExemptionReasonCode": {
                "_text": "10"
              },

              "cac:TaxScheme": {

                "cbc:ID": {
                  "_text": "1000"
                },

                "cbc:Name": {
                  "_text": "IGV"
                },

                "cbc:TaxTypeCode": {
                  "_text": "VAT"
                }
              }
            }
          }
        ]
      },

      "cac:Item": {

        "cbc:Description": {
          "_text": item.nombreSnapshot
        },

        "cac:SellersItemIdentification": {

          "cbc:ID": {
            "_text": item.productId
          }
        }
      },

      "cac:Price": {

        "cbc:PriceAmount": {

          "_attributes": {
            "currencyID": sale.currency
          },

          "_text": Number(item.valorUnitario)
        }
      }
    };
  });

  return {

    personaId: company.personaId,

    personaToken: company.personaToken,

    fileName,

    customerEmail:
      sale.customer?.email || undefined,

    documentBody: {

      "cbc:UBLVersionID": {
        "_text": "2.1"
      },

      "cbc:CustomizationID": {
        "_text": "2.0"
      },

      "cbc:ID": {
        "_text": numeroComprobante
      },

      "cbc:IssueDate": {
        "_text": issueDate
      },

      "cbc:IssueTime": {
        "_text": issueTime
      },

      "cbc:InvoiceTypeCode": {

        "_attributes": {
          "listID": "0101"
        },

        "_text": tipoDocSunat
      },

      "cbc:Note": [

        {

          "_text": montoLetras,

          "_attributes": {
            "languageLocaleID": "1000"
          }
        }
      ],

      "cbc:DocumentCurrencyCode": {
        "_text": sale.currency
      },

      "cac:AccountingSupplierParty": {

        "cac:Party": {

          "cac:PartyIdentification": {

            "cbc:ID": {

              "_attributes": {
                "schemeID": "6"
              },

              "_text": company.ruc
            }
          },

          "cac:PartyName": {

            "cbc:Name": {

              "_text":
                company.nombreComercial ||
                company.razonSocial
            }
          },

          "cac:PartyLegalEntity": {

            "cbc:RegistrationName": {

              "_text": company.razonSocial
            },

            "cac:RegistrationAddress": {

              "cbc:AddressTypeCode": {
                "_text": "0000"
              },

              "cac:AddressLine": {

                "cbc:Line": {
                  "_text": company.direccion
                }
              }
            }
          }
        }
      },

      "cac:AccountingCustomerParty": {

        "cac:Party": {

          "cac:PartyIdentification": {

            "cbc:ID": {

              "_attributes": {
                "schemeID": tipoDocumentoCliente
              },

              "_text": clienteDocumento
            }
          },

          "cac:PartyLegalEntity": {

            "cbc:RegistrationName": {

              "_text": clienteNombre
            }
          }
        }
      },

      "cac:TaxTotal": {

        "cbc:TaxAmount": {

          "_attributes": {
            "currencyID": sale.currency
          },

          "_text": Number(sale.igv)
        },

        "cac:TaxSubtotal": [

          {

            "cbc:TaxableAmount": {

              "_attributes": {
                "currencyID": sale.currency
              },

              "_text": Number(sale.subtotal)
            },

            "cbc:TaxAmount": {

              "_attributes": {
                "currencyID": sale.currency
              },

              "_text": Number(sale.igv)
            },

            "cac:TaxCategory": {

              "cac:TaxScheme": {

                "cbc:ID": {
                  "_text": "1000"
                },

                "cbc:Name": {
                  "_text": "IGV"
                },

                "cbc:TaxTypeCode": {
                  "_text": "VAT"
                }
              }
            }
          }
        ]
      },

      "cac:LegalMonetaryTotal": {

        "cbc:LineExtensionAmount": {

          "_attributes": {
            "currencyID": sale.currency
          },

          "_text": Number(sale.subtotal)
        },

        "cbc:TaxInclusiveAmount": {

          "_attributes": {
            "currencyID": sale.currency
          },

          "_text": Number(sale.total)
        },

        "cbc:PayableAmount": {

          "_attributes": {
            "currencyID": sale.currency
          },

          "_text": Number(sale.total)
        }
      },

      "cac:InvoiceLine": invoiceLines
    }
  };
};

module.exports = {
  generarComprobanteJson
};