const ExcelJS = require('exceljs');
const db = require("../../../../models");

module.exports = {
    downloadXLSX: async (res, data, header, filename) => {
        const worksheetName = filename
        const xlFileName = `${filename}.xlsx`
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`${worksheetName}`);

        worksheet.columns = header;
        data.forEach(d => {
            worksheet.addRow(d);
        });
        // Set response headers to indicate file download
        res.setHeader('Content-Disposition', `attachment; filename=${xlFileName}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const buffer = await workbook.xlsx.writeBuffer();
        res.end(buffer);
    }    
}