import os
from flask import Blueprint, jsonify, g, send_file, current_app
from database import db
from models import Dataset
from auth import login_required
from fpdf import FPDF

reports_bp = Blueprint('reports', __name__)

class PDFReport(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 15)
        self.set_text_color(51, 65, 85) # Slate-700
        self.cell(0, 10, 'AI Data Analytics Dashboard - Insights Report', 0, 1, 'L')
        self.set_draw_color(226, 232, 240) # Slate-200
        self.line(10, 20, 200, 20)
        self.ln(10)
        
    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(148, 163, 184) # Slate-400
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', 0, 0, 'C')

def create_insights_pdf(dataset, insights_data):
    pdf = PDFReport()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(71, 85, 105) # Slate-600
    
    # 1. Document Title & Summary Info
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(30, 41, 59) # Slate-800
    pdf.cell(0, 10, f'Dataset Summary: {dataset.filename}', 0, 1, 'L')
    pdf.ln(2)
    
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(50, 6, f"Total Rows:", 0, 0)
    pdf.cell(0, 6, f"{dataset.row_count:,}", 0, 1)
    pdf.cell(50, 6, f"Total Columns:", 0, 0)
    pdf.cell(0, 6, f"{dataset.col_count}", 0, 1)
    
    meta = dataset.get_metadata()
    total_nulls = meta.get('total_nulls', 0)
    null_rate = meta.get('null_rate', 0.0)
    dup_count = meta.get('duplicate_count', 0)
    
    pdf.cell(50, 6, f"Missing Values:", 0, 0)
    pdf.cell(0, 6, f"{total_nulls:,} ({null_rate:.2f}%)", 0, 1)
    pdf.cell(50, 6, f"Duplicate Rows:", 0, 0)
    pdf.cell(0, 6, f"{dup_count:,}", 0, 1)
    pdf.cell(50, 6, f"Analysis Date:", 0, 0)
    pdf.cell(0, 6, f"{dataset.created_at.strftime('%Y-%m-%d %H:%M:%S')}", 0, 1)
    pdf.ln(10)
    
    # 2. Data Dictionary Section
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 10, 'Data Dictionary', 0, 1, 'L')
    pdf.ln(2)
    
    # Table Header
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_fill_color(241, 245, 249) # Slate-100
    pdf.cell(60, 8, ' Column Name', 1, 0, 'L', True)
    pdf.cell(40, 8, ' Detected Type', 1, 0, 'L', True)
    pdf.cell(40, 8, ' Missing %', 1, 0, 'L', True)
    pdf.cell(50, 8, ' Unique Values', 1, 1, 'L', True)
    
    pdf.set_font('Helvetica', '', 10)
    for col_info in meta.get('data_dictionary', []):
        col_name = col_info.get('column_name', '')
        # Truncate column name if too long for layout
        if len(col_name) > 25:
            col_name = col_name[:22] + '...'
            
        pdf.cell(60, 8, f" {col_name}", 1, 0, 'L')
        pdf.cell(40, 8, f" {col_info.get('detected_type', '')}", 1, 0, 'L')
        pdf.cell(40, 8, f" {col_info.get('null_percentage', 0.0):.1f}%", 1, 0, 'L')
        pdf.cell(50, 8, f" {col_info.get('unique_values', 0):,}", 1, 1, 'L')
        
    pdf.ln(10)
    
    # 3. Automated Insights Section
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 10, 'Automated Insights', 0, 1, 'L')
    pdf.ln(2)
    
    insights = insights_data.get('insights', [])
    if not insights:
        pdf.set_font('Helvetica', 'I', 10)
        pdf.cell(0, 8, 'No significant insights or correlations detected.', 0, 1, 'L')
    else:
        for idx, insight in enumerate(insights):
            # Check page overflow before writing
            if pdf.get_y() > 250:
                pdf.add_page()
                pdf.ln(5)
                
            pdf.set_font('Helvetica', 'B', 11)
            pdf.set_text_color(15, 23, 42) # Slate-900
            pdf.cell(0, 6, f"{idx + 1}. {insight.get('title')}", 0, 1, 'L')
            
            pdf.set_font('Helvetica', '', 10)
            pdf.set_text_color(71, 85, 105)
            
            # Use multi_cell for wrapping text
            pdf.multi_cell(0, 5, insight.get('description'))
            pdf.ln(4)
            
    # Output to local byte string
    return pdf.output()

@reports_bp.route('/<int:dataset_id>/report', methods=['GET'])
@login_required
def export_report(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    try:
        # We need insights to display them on report.
        # Let's import generate_insights from insights blueprint helper
        from insights import generate_insights
        
        # We call the insight logic directly
        response, status_code = generate_insights(dataset_id)
        if status_code != 200:
            return response, status_code
            
        insights_data = response.get_json()
        
        # Build PDF
        pdf_bytes = create_insights_pdf(dataset, insights_data)
        
        # Save temp PDF
        reports_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'temp_reports')
        os.makedirs(reports_dir, exist_ok=True)
        
        temp_pdf_path = os.path.join(reports_dir, f"report_{dataset_id}.pdf")
        
        # In fpdf2 output() returns bytes by default if no dest/name is given
        with open(temp_pdf_path, 'wb') as f:
            f.write(pdf_bytes)
            
        return send_file(
            temp_pdf_path,
            as_attachment=True,
            download_name=f"AI_Insights_Report_{dataset.filename.rsplit('.', 1)[0]}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': f'Failed to export report: {str(e)}'}), 500

@reports_bp.route('/<int:dataset_id>/cleaned', methods=['GET'])
@login_required
def export_cleaned_dataset(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    if not os.path.exists(dataset.filepath):
        return jsonify({'error': 'File not found on server'}), 404
        
    try:
        # Determine mimetype
        if dataset.filename.endswith('.csv'):
            mimetype = 'text/csv'
        else:
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            
        return send_file(
            dataset.filepath,
            as_attachment=True,
            download_name=f"Cleaned_{dataset.filename}",
            mimetype=mimetype
        )
    except Exception as e:
        return jsonify({'error': f'Failed to export file: {str(e)}'}), 500
