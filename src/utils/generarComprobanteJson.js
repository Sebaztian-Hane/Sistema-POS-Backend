const { NumeroALetras } = require('numero-a-letras');

const generarComprobanteJson = ({ company, sale }) => {

  const fecha = new Date(sale.fechaEmision || sale.createdAt);

  const issueDate = fecha.toISOString().split('T')[0];

  const issueTime = fecha.toLocaleTimeString('en-GB', { hour12: false });

  const mapaTipoDocumento = {

    FACTURA: '01',

    BOLETA: '03'
  };

  const tipoDocSunat = mapaTipoDocumento[sale.tipoComprobante];

  const correlativoFormateado = String(sale.correlativo)
    .padStart(8, '0');

  const numeroComprobante =
    `${sale.serie}-${correlativoFormateado}`;

  const fileName =
    `${company.ruc}-${tipoDocSunat}-${sale.serie}-${correlativoFormateado}`;

  const clienteDocumento =
    sale.customer?.nroDocumento || '-';

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
        return '-';
    }
  })();


  const obtenerMontoLetras = (monto) => {
    try {
      // Convertir a número y separar parte entera y decimal
      const numero = Number(monto);
      const parteEntera = Math.floor(numero);
      const parteDecimal = Math.round((numero - parteEntera) * 100);
      
      // Convertir la parte entera a letras
      const letrasEntero = NumeroALetras(parteEntera);
      
      // Formato SUNAT: "TRES MIL QUINIENTOS Y 00/100 SOLES"
      const decimalFormateado = parteDecimal.toString().padStart(2, '0');
      
      return `${letrasEntero} Y ${decimalFormateado}/100 SOLES`;
    } catch (error) {
      console.error('Error al convertir monto a letras:', error);
      // Fallback seguro
      return `${Number(monto).toFixed(2)} SOLES`;
    }
  };

  const montoLetras = obtenerMontoLetras(sale.total);
  
  const money = (value) => Number(Number(value).toFixed(2));

  const invoiceLines = sale.items.map((item, index) => {

    // Calcular valor unitario sin IGV (precioSnapshot ya incluye IGV)
    const valorUnitarioSinIgv = Number(item.valorUnitario);
    const precioUnitarioConIgv = Number(item.precioSnapshot);
    const cantidad = item.quantity;
    const subtotalItem = money(item.subtotal)
    const igvItem = Number(item.igv);
    const totalItem = Number(item.total);

    return {

      "cbc:ID": {
        "_text": index + 1
      },

      "cbc:InvoicedQuantity": {
        "_attributes": {
          "unitCode": "NIU"
        },
        "_text": cantidad
      },

      "cbc:LineExtensionAmount": {
        "_attributes": {
          "currencyID": sale.currency
        },
        "_text": subtotalItem
      },

      "cac:PricingReference": {

        "cac:AlternativeConditionPrice": {

          "cbc:PriceAmount": {
            "_attributes": {
              "currencyID": sale.currency
            },
            "_text": precioUnitarioConIgv
          },

          "cbc:PriceTypeCode": {
            "_text": "01"  // 01 = Precio unitario (incluye IGV)
          }
        }
      },

      "cac:TaxTotal": {

        "cbc:TaxAmount": {

          "_attributes": {
            "currencyID": sale.currency
          },

          "_text": igvItem
        },

        "cac:TaxSubtotal": [

          {

            "cbc:TaxableAmount": {

              "_attributes": {
                "currencyID": sale.currency
              },

              "_text": subtotalItem
            },

            "cbc:TaxAmount": {

              "_attributes": {
                "currencyID": sale.currency
              },

              "_text": igvItem
            },

            "cac:TaxCategory": {

              "cbc:Percent": {
                "_text": 18
              },

              "cbc:TaxExemptionReasonCode": {
                "_text": "10"  // 10 = Gravado
              },

              "cac:TaxScheme": {

                "cbc:ID": {
                  "_text": "1000"  // 1000 = IGV
                },

                "cbc:Name": {
                  "_text": "IGV"
                },

                "cbc:TaxTypeCode": {
                  "_text": "VAT"  // VAT = Impuesto al Valor Agregado
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
            "_text": String(item.productId)
          }
        }
      },

      "cac:Price": {

        "cbc:PriceAmount": {

          "_attributes": {
            "currencyID": sale.currency
          },

          "_text": valorUnitarioSinIgv
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

      // ✅ NOTA con monto en letras (formato SUNAT)
      "cbc:Note": [

        {

          "_text": montoLetras,

          "_attributes": {
            "languageLocaleID": "1000"  // 1000 = Español
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
                "schemeID": "6"  // 6 = RUC
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
                "_text": "0000"  // 0000 = Dirección fiscal
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
          },

          // Dirección del cliente (opcional)
          ...(sale.customer?.direccion && {
            "cac:PhysicalLocation": {
              "cac:Address": {
                "cac:AddressLine": {
                  "cbc:Line": sale.customer.direccion
                }
              }
            }
          })
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