// Creates a sample DOCX resume with deliberate ABQE risk factors for testing
import { Document, Paragraph, TextRun, Packer, HeadingLevel } from 'docx';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const doc = new Document({
  sections: [{
    children: [
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Alex Rivera', bold: true, size: 36 })] }),
      new Paragraph({ children: [new TextRun({ text: 'alex.rivera@email.com  |  linkedin.com/in/alexrivera', size: 20 })] }),
      new Paragraph({}),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'EXPERIENCE', bold: true })] }),

      new Paragraph({ children: [new TextRun({ text: 'Data Analyst — Midwest Analytics Group  (Jan 2017 – Mar 2022)', bold: true, size: 22 })] }),
      new Paragraph({ children: [new TextRun({ text: '• Was responsible for building dashboards and reports', size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: '• Helped with data cleaning and processing tasks', size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: '• Worked on SQL queries for the analytics team', size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: '• Did some Python scripting', size: 20 })] }),
      new Paragraph({}),

      new Paragraph({ children: [new TextRun({ text: 'Employment Gap  (Apr 2022 – Sep 2023)', bold: true, size: 22, color: '555555' })] }),
      new Paragraph({ children: [new TextRun({ text: '(Personal reasons)', size: 20 })] }),
      new Paragraph({}),

      new Paragraph({ children: [new TextRun({ text: 'Junior Analyst — Regional Consulting LLC  (Jun 2015 – Dec 2016)', bold: true, size: 22 })] }),
      new Paragraph({ children: [new TextRun({ text: '• Assisted with report generation', size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: '• Helped team with Excel-based models', size: 20 })] }),
      new Paragraph({}),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'EDUCATION', bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: 'B.S. Information Systems — Central State University  (2015)', size: 20 })] }),
      new Paragraph({}),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'SKILLS', bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: 'Python, SQL, Excel, Tableau, some machine learning, data work', size: 20 })] }),
    ],
  }],
});

const buf = await Packer.toBuffer(doc);
const out = join(__dirname, '..', 'test-resume.docx');
writeFileSync(out, buf);
console.log('Wrote test resume to ' + out + ' (' + buf.byteLength + ' bytes)');
