// src/components/QuotationForm.js
import React, { useState, useEffect, useMemo } from "react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmationModal from './ConfirmationModal'; // Ensure this path is correct

// --- Font Embedding (Optional) ---
// const NOTO_SANS_REGULAR_BASE64 = "AAEAAAE..."; // Replace with actual Base64
const NOTO_SANS_REGULAR_BASE64 = ""; // Leave empty or remove if not embedding

const QuotationForm = ({ items, projectDetails: initialProjectDetails }) => {
  const [quantities, setQuantities] = useState({});

  const defaultProjectDetails = {
    projectTitle: 'Sample Project Title',
    projectOwner: 'Client Name',
    location: 'Project Location',
    projectDuration: '30-45 Days',
    reportDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  };

  const [currentQuotationProjectDetails, setCurrentQuotationProjectDetails] = useState(() => {
    const startingDetails = { ...defaultProjectDetails };
    if (initialProjectDetails) {
      if (initialProjectDetails.projectTitle !== undefined) startingDetails.projectTitle = initialProjectDetails.projectTitle;
      if (initialProjectDetails.projectOwner !== undefined) startingDetails.projectOwner = initialProjectDetails.projectOwner;
      if (initialProjectDetails.location !== undefined) startingDetails.location = initialProjectDetails.location;
      if (initialProjectDetails.projectDuration !== undefined) startingDetails.projectDuration = initialProjectDetails.projectDuration;
      if (initialProjectDetails.reportDate !== undefined) startingDetails.reportDate = initialProjectDetails.reportDate;
    }
    return startingDetails;
  });

  useEffect(() => {
    if (initialProjectDetails) {
      setCurrentQuotationProjectDetails(prevDetails => {
        const newDetails = { ...defaultProjectDetails, ...prevDetails, ...initialProjectDetails };
        newDetails.projectTitle = initialProjectDetails.projectTitle !== undefined ? initialProjectDetails.projectTitle : prevDetails.projectTitle;
        newDetails.projectOwner = initialProjectDetails.projectOwner !== undefined ? initialProjectDetails.projectOwner : prevDetails.projectOwner;
        newDetails.location = initialProjectDetails.location !== undefined ? initialProjectDetails.location : prevDetails.location;
        newDetails.projectDuration = initialProjectDetails.projectDuration !== undefined ? initialProjectDetails.projectDuration : prevDetails.projectDuration;
        newDetails.reportDate = initialProjectDetails.reportDate !== undefined ? initialProjectDetails.reportDate : prevDetails.reportDate;
        return newDetails;
      });
    }
  }, [initialProjectDetails]);

  const handleProjectDetailsChange = (e) => {
    const { name, value } = e.target;
    setCurrentQuotationProjectDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleQuantityChange = (itemId, amount) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, (parseInt(prev[itemId], 10) || 0) + amount),
    }));
  };

  const handleInputChange = (itemId, value) => {
    const num = parseInt(value, 10);
    setQuantities((prev) => ({
      ...prev,
      [itemId]: isNaN(num) || num < 0 ? "" : num,
    }));
  };

  const grandTotalSelectedItems = useMemo(() => {
    let total = 0;
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (!item || !item._id) return;
        const quantity = parseInt(quantities[item._id], 10) || 0;
        if (quantity > 0) {
          const materialCost = parseFloat(item.materialCost) || 0;
          const laborCost = parseFloat(item.laborCost) || 0;
          total += (materialCost + laborCost) * quantity;
        }
      });
    }
    return total;
  }, [items, quantities]);

  const [quotationSearchTerm, setQuotationSearchTerm] = useState("");
  const [quotationSortAscending, setQuotationSortAscending] = useState(true);

  const handleQuotationSearchChange = (e) => {
    setQuotationSearchTerm(e.target.value);
  };

  const toggleQuotationSortDirection = () => {
    setQuotationSortAscending(prev => !prev);
  };

  const displayableItemsForSelection = useMemo(() => {
    let filteredAndSorted = Array.isArray(items) ? [...items] : [];
    if (quotationSearchTerm.trim() !== "") {
      filteredAndSorted = filteredAndSorted.filter(item =>
        item && item.name && typeof item.name === 'string' && item.name.toLowerCase().includes(quotationSearchTerm.toLowerCase())
      );
    }
    filteredAndSorted.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      if (nameA < nameB) return quotationSortAscending ? -1 : 1;
      if (nameA > nameB) return quotationSortAscending ? 1 : -1;
      return 0;
    });
    return filteredAndSorted;
  }, [items, quotationSearchTerm, quotationSortAscending]);

  // --- State for PDF Confirmation Modal (MUST BE AT TOP LEVEL) ---
  const [showPdfConfirmModal, setShowPdfConfirmModal] = useState(false);

  // --- Actual PDF Generation Logic (Moved here from original handleGeneratePDF) ---
  const executePdfGeneration = () => {
    console.log("User confirmed. Proceeding with PDF generation...");
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    let FONT_ALIAS = 'Helvetica';
    const FONT_TO_USE = 'Arial';

    if (NOTO_SANS_REGULAR_BASE64 && NOTO_SANS_REGULAR_BASE64.startsWith("AAEAA")) {
        try {
            const FONT_FILE_NAME_VFS = 'MyCustomFont.ttf'; const FONT_INTERNAL_ALIAS = 'MyCustomFont';
            doc.addFileToVFS(FONT_FILE_NAME_VFS, NOTO_SANS_REGULAR_BASE64);
            doc.addFont(FONT_FILE_NAME_VFS, FONT_INTERNAL_ALIAS, 'normal');
            doc.setFont(FONT_INTERNAL_ALIAS, 'normal'); FONT_ALIAS = FONT_INTERNAL_ALIAS;
            console.log("Custom font embedded and set for PDF.");
        } catch (e) { console.error("Error embedding font for PDF:", e); doc.setFont(FONT_TO_USE, 'normal'); FONT_ALIAS = FONT_TO_USE; }
    } else {
        try { doc.setFont(FONT_TO_USE, 'normal'); FONT_ALIAS = FONT_TO_USE; }
        catch (e) { console.warn(`Font ${FONT_TO_USE} not available, falling back.`, e); doc.setFont('Helvetica', 'normal'); FONT_ALIAS = 'Helvetica';}
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - (2 * margin);
    const formatCurrencyForPDF = (val) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(2) : '0.00');

    // --- PDF Header ---
    doc.setFontSize(9);
    const labelIndent = margin;
    const valueIndent = margin + 42;
    doc.setFont(FONT_ALIAS, 'bold');
    doc.text('PROJECT TITLE:', labelIndent, 15);
    doc.setFont(FONT_ALIAS, 'normal');
    doc.text(currentQuotationProjectDetails.projectTitle, valueIndent, 15, { maxWidth: contentWidth * 0.55 - valueIndent });
    doc.setFont(FONT_ALIAS, 'bold');
    doc.text('PROJECT OWNER:', labelIndent, 20);
    doc.setFont(FONT_ALIAS, 'normal');
    doc.text(currentQuotationProjectDetails.projectOwner, valueIndent, 20, { maxWidth: contentWidth * 0.55 - valueIndent });
    doc.setFont(FONT_ALIAS, 'bold');
    doc.text('TOTAL PROJECT COST:', labelIndent, 25);
    doc.setFont(FONT_ALIAS, 'normal');
    doc.text(formatCurrencyForPDF(grandTotalSelectedItems), valueIndent, 25, { maxWidth: contentWidth * 0.55 - valueIndent });
    const rightColumnLabelStartX = margin + contentWidth * 0.58;
    const valuePadding = 2;
    doc.setFont(FONT_ALIAS, 'normal');
    doc.text(currentQuotationProjectDetails.reportDate, pageWidth - margin, 15, { align: 'right' });
    const locationLabel = "LOCATION:";
    doc.setFont(FONT_ALIAS, 'bold');
    const locationLabelWidth = doc.getTextWidth(locationLabel);
    doc.text(locationLabel, rightColumnLabelStartX, 20);
    doc.setFont(FONT_ALIAS, 'normal');
    doc.text(currentQuotationProjectDetails.location, rightColumnLabelStartX + locationLabelWidth + valuePadding, 20, { maxWidth: pageWidth - (rightColumnLabelStartX + locationLabelWidth + valuePadding) - margin });
    const durationLabel = "PROJECT DURATION:";
    doc.setFont(FONT_ALIAS, 'bold');
    const durationLabelWidth = doc.getTextWidth(durationLabel);
    doc.text(durationLabel, rightColumnLabelStartX, 25);
    doc.setFont(FONT_ALIAS, 'normal');
    doc.text(currentQuotationProjectDetails.projectDuration, rightColumnLabelStartX + durationLabelWidth + valuePadding, 25, { maxWidth: pageWidth - (rightColumnLabelStartX + durationLabelWidth + valuePadding) - margin });

    let startY = 38;
    const tableRows = [];
    let pdfOverallMaterialCost = 0;
    let pdfOverallLaborCost = 0;
    let itemCounterForPDF = 1;
    let currentCategoryInPDF = "";

    const itemsToProcessInPDF = Array.isArray(items) ? items : [];
    const sortedItemsForPDF = [...itemsToProcessInPDF]
        .filter(item => item && item._id && (parseInt(quantities[item._id], 10) || 0) > 0)
        .sort((a, b) => {
            const categoryA = a.category || "zzz_No Category";
            const categoryB = b.category || "zzz_No Category";
            const categoryComp = categoryA.localeCompare(categoryB);
            if (categoryComp !== 0) return categoryComp;
            const itemNoA = a.itemNo || String(a.name || '');
            const itemNoB = b.itemNo || String(b.name || '');
            return itemNoA.localeCompare(itemNoB);
        });

    sortedItemsForPDF.forEach(item => {
        const quantity = parseInt(quantities[item._id], 10) || 0;
        const itemCategory = item.category || "NO CATEGORY ASSIGNED";
        if (itemCategory !== currentCategoryInPDF) {
            tableRows.push([{
                content: itemCategory.toUpperCase(), colSpan: 9,
                styles: { font: FONT_ALIAS, fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0,0,0], halign: 'left', cellPadding: 2, fontSize: 8.5 }
            }]);
            currentCategoryInPDF = itemCategory;
        }
        const materialCost = parseFloat(item.materialCost) || 0;
        const laborCost = parseFloat(item.laborCost) || 0;
        const totalMaterialCostForItem = materialCost * quantity;
        const totalLaborCostForItem = laborCost * quantity;
        const amount = totalMaterialCostForItem + totalLaborCostForItem;
        pdfOverallMaterialCost += totalMaterialCostForItem;
        pdfOverallLaborCost += totalLaborCostForItem;
        tableRows.push([
          item.itemNo || itemCounterForPDF++, item.description || item.name || "N/A", quantity, item.unit || 'pc',
          formatCurrencyForPDF(materialCost), formatCurrencyForPDF(totalMaterialCostForItem),
          formatCurrencyForPDF(laborCost), formatCurrencyForPDF(totalLaborCostForItem), formatCurrencyForPDF(amount),
        ]);
    });

    if (tableRows.length > 0) {
      autoTable(doc, {
        startY: startY,
        head: [['ITEM NO.', 'ITEM DESCRIPTION', 'QTY', 'UNIT', 'MATERIAL COST', 'TOTAL MATERIAL', 'LABOR COST', 'TOTAL LABOR', 'AMOUNT']],
        body: tableRows, theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak', font: FONT_ALIAS },
        headStyles: { font: FONT_ALIAS, fontStyle: 'bold', fillColor: [200,200,200], textColor: [0,0,0], halign: 'center', valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 75 }, 2: { cellWidth: 13, halign: 'right' },
            3: { cellWidth: 15, halign: 'center' }, 4: { cellWidth: 27, halign: 'right' }, 5: { cellWidth: 30, halign: 'right' },
            6: { cellWidth: 27, halign: 'right' }, 7: { cellWidth: 30, halign: 'right' }, 8: { cellWidth: 31, halign: 'right' },
        },
        margin: { top: startY, bottom: 30, left: margin, right: margin }
      });
      startY = doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY + 8 : startY + 10;
    } else {
      doc.setFont(FONT_ALIAS, 'normal'); doc.text('No items selected for this quotation.', margin, startY); startY += 10;
    }

    if (grandTotalSelectedItems > 0 && startY < pageHeight - 45) {
        const summaryStartY = startY; const summaryBoxX = pageWidth - margin - 95; const summaryBoxWidth = 90;
        const valueColumnX = summaryBoxX + summaryBoxWidth - 5; const labelColumnX = summaryBoxX + 5;
        let currentSummaryYOffset = 0;
        doc.setLineWidth(0.3); doc.rect(summaryBoxX, summaryStartY + currentSummaryYOffset, summaryBoxWidth, 20); currentSummaryYOffset += 5;
        doc.setFontSize(8); doc.setFont(FONT_ALIAS, 'normal');
        doc.text("Total Material Cost", labelColumnX, summaryStartY + currentSummaryYOffset);
        doc.text(formatCurrencyForPDF(pdfOverallMaterialCost), valueColumnX, summaryStartY + currentSummaryYOffset, { align: 'right' }); currentSummaryYOffset += 5;
        doc.text("Total Labor Cost", labelColumnX, summaryStartY + currentSummaryYOffset);
        doc.text(formatCurrencyForPDF(pdfOverallLaborCost), valueColumnX, summaryStartY + currentSummaryYOffset, { align: 'right' }); currentSummaryYOffset += 5;
        doc.setFont(FONT_ALIAS, 'bold');
        doc.text("TOTAL PROJECT COST", labelColumnX, summaryStartY + currentSummaryYOffset);
        doc.text(formatCurrencyForPDF(grandTotalSelectedItems), valueColumnX, summaryStartY + currentSummaryYOffset, { align: 'right' });
        startY = summaryStartY + currentSummaryYOffset + 8;
    }

    const signatureBlockMinHeight = 30; let signatureY = startY + 5;
    if (signatureY + signatureBlockMinHeight > pageHeight - (margin / 2)) {
        doc.addPage(); signatureY = margin + 15; doc.setFont(FONT_ALIAS, 'normal'); doc.setFontSize(8);
        doc.text(`Continuation - Quotation: ${currentQuotationProjectDetails.projectTitle}`, margin, margin - 2);
    }
    const preparedByX = margin + 20; const conformeByX = pageWidth / 2 + 30;
    doc.setFontSize(9); doc.setFont(FONT_ALIAS, 'normal');
    doc.text("Prepared by:", preparedByX, signatureY); doc.setLineWidth(0.3); doc.line(preparedByX, signatureY + 7, preparedByX + 60, signatureY + 7);
    doc.text("Jomar R. Cuate", preparedByX, signatureY + 12); doc.text("Proprietor", preparedByX, signatureY + 16);
    doc.text("Conforme by:", conformeByX, signatureY); doc.line(conformeByX, signatureY + 7, conformeByX + 60, signatureY + 7);

    const quotationNumber = `QT-${Date.now()}`;
    doc.save(`${quotationNumber}_${currentQuotationProjectDetails.projectTitle.replace(/\s+/g, '_')}_Quotation.pdf`);
  };

  // --- This function is called by the "Generate PDF" button ---
  const handleGeneratePDFClick = () => {
    if (grandTotalSelectedItems === 0) { // Check if items with cost are selected
        if (!Array.isArray(items) || items.length === 0) {
            alert("Please add items to the system first (via Item Management) before generating a quotation.");
        } else {
            alert("Please select quantities for items to include in the quotation before generating a PDF.");
        }
        return;
    }
    setShowPdfConfirmModal(true); // Show the modal
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
        Prepare Quotation Details
      </h2>

      <div className="mb-8 p-4 border border-gray-300 rounded-md bg-white space-y-3">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">Project Overview (Editable for this PDF)</h3>
        <div>
          <label htmlFor="qFormProjectTitle" className="block text-sm font-medium text-gray-700">Project Title</label>
          <input type="text" id="qFormProjectTitle" name="projectTitle"
            value={currentQuotationProjectDetails.projectTitle} onChange={handleProjectDetailsChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="qFormProjectOwner" className="block text-sm font-medium text-gray-700">Project Owner</label>
          <input type="text" id="qFormProjectOwner" name="projectOwner"
            value={currentQuotationProjectDetails.projectOwner} onChange={handleProjectDetailsChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="qFormLocation" className="block text-sm font-medium text-gray-700">Location</label>
          <input type="text" id="qFormLocation" name="location"
            value={currentQuotationProjectDetails.location} onChange={handleProjectDetailsChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="qFormProjectDuration" className="block text-sm font-medium text-gray-700">Project Duration</label>
          <input type="text" id="qFormProjectDuration" name="projectDuration"
            value={currentQuotationProjectDetails.projectDuration} onChange={handleProjectDetailsChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., 30-45 Days"
          />
        </div>
        <div className="pt-2">
            <p className="text-sm text-gray-600">
                <span className="font-medium">Report Date:</span> {currentQuotationProjectDetails.reportDate}
            </p>
            <p className="text-lg text-gray-700 mt-1">
                <span className="font-semibold">Computed Total Quotation Cost:</span>
                <span className="ml-2 font-bold text-indigo-600">{grandTotalSelectedItems.toFixed(2)}</span>
            </p>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-700 mb-4">Select Items for Quotation</h3>
      <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-md border items-center">
        <input
          type="text"
          placeholder="Search items by name..."
          value={quotationSearchTerm}
          onChange={handleQuotationSearchChange}
          className="input input-bordered w-full sm:flex-grow p-2 text-sm h-10"
        />
        <button
          onClick={toggleQuotationSortDirection}
          className="btn btn-outline btn-sm w-full sm:w-auto h-10"
        >
          Sort Name ({quotationSortAscending ? "A-Z" : "Z-A"})
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 mb-6 custom-scrollbar">
        {(displayableItemsForSelection.length > 0) ? displayableItemsForSelection.map((item) => (
          item && item._id ?
          <div key={item._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border p-3 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
            <div className="w-full sm:w-3/5 mb-2 sm:mb-0">
              <div className="font-medium text-gray-800">{item.name || "Unnamed Item"}</div>
              <div className="text-xs text-gray-500">
                Unit: {item.unit || "N/A"}
                {item.materialCost != null && <span className="ml-2">Mat. Cost: {parseFloat(item.materialCost).toFixed(2)}</span>}
                {item.laborCost != null && <span className="ml-2">Labor Cost: {parseFloat(item.laborCost).toFixed(2)}</span>}
              </div>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-center">
              <button type="button" className="px-2.5 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm disabled:opacity-50"
                onClick={() => handleQuantityChange(item._id, -1)}
                disabled={(parseInt(quantities[item._id], 10) || 0) === 0}
              >-</button>
              <input type="number" min="0" value={quantities[item._id] || ""}
                onChange={(e) => handleInputChange(item._id, e.target.value)} placeholder="0"
                className="w-16 text-center border border-gray-300 rounded p-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button type="button" className="px-2.5 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                onClick={() => handleQuantityChange(item._id, 1)}
              >+</button>
            </div>
          </div>
          : null
        )) : (
          <p className="text-center text-gray-500 my-4">
            {quotationSearchTerm ? "No items match your search." : (Array.isArray(items) && items.length > 0 ? "All available items currently hidden by search/filter." : "No items available to select.")}
          </p>
        )}
      </div>

      {(!Array.isArray(items) || items.length === 0) && !quotationSearchTerm && (
         <p className="text-center text-gray-500 my-6">No items have been added to the system yet to select for a quotation.</p>
      )}

      <div className="flex flex-col sm:flex-row justify-end items-center pt-6 mt-6 border-t">
         <button type="button" onClick={() => { setQuantities({}); setQuotationSearchTerm(""); }}
          className="btn btn-outline btn-sm mb-3 sm:mb-0 sm:mr-3 w-full sm:w-auto"
        > Clear Quantities & Search </button>
        <button type="button" onClick={handleGeneratePDFClick} // This button now calls the modal trigger
          disabled={grandTotalSelectedItems === 0 && items.length > 0 && Object.keys(quantities).length === 0 } // Adjusted disabled logic
          className="btn btn-success btn-md w-full sm:w-auto"
        > Generate PDF Quotation </button>
      </div>

      {/* Confirmation Modal for PDF Generation */}
      <ConfirmationModal
        isOpen={showPdfConfirmModal}
        onClose={() => setShowPdfConfirmModal(false)}
        onConfirm={() => {
          setShowPdfConfirmModal(false); // Close modal
          executePdfGeneration();       // Proceed with PDF generation
        }}
        title="Confirm PDF Generation"
        message="Are you sure you want to generate the PDF with the current details and selected items?"
        confirmText="Generate PDF"
        cancelText="Cancel"
      />
    </div>
  );
};

export default QuotationForm;