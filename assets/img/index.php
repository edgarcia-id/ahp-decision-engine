<?php
// Set HTTP response code to 403 Forbidden
http_response_code(403);
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 Forbidden - NusaIT Assets</title>
    <style>
        /* Reset & Base Styles */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f6f9;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }

        /* Card Container */
        .error-card {
            background: #ffffff;
            width: 90%;
            max-width: 450px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            overflow: hidden;
            text-align: center;
            position: relative;
            border-top: 5px solid #0063B0; /* Nusa Blue */
        }

        /* Header Icon Area */
        .icon-area {
            background-color: #fafafa;
            padding: 30px 0;
            position: relative;
        }

        .lock-icon {
            width: 60px;
            height: 60px;
            fill: #E88D14; /* Nusa Orange */
            margin-bottom: 10px;
        }

        /* Content Area */
        .content {
            padding: 30px;
        }

        h1 {
            font-size: 24px;
            font-weight: 700;
            color: #0063B0; /* Nusa Blue */
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }

        p {
            font-size: 15px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 25px;
        }

        /* Button Style */
        .btn-home {
            display: inline-block;
            text-decoration: none;
            background-color: #0063B0; /* Nusa Blue */
            color: #ffffff;
            padding: 12px 25px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            border-bottom: 3px solid #004a85; /* Darker Blue for depth */
        }

        .btn-home:hover {
            background-color: #E88D14; /* Nusa Orange on hover */
            border-bottom-color: #bf720d; /* Darker Orange */
            transform: translateY(-1px);
        }

        /* Footer Branding */
        .footer {
            font-size: 11px;
            color: #999;
            padding-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        /* Decorative Orange Line */
        .accent-line {
            height: 4px;
            width: 40px;
            background-color: #E88D14; /* Nusa Orange */
            margin: 0 auto 20px auto;
            border-radius: 2px;
        }

    </style>
</head>
<body>

    <div class="error-card">
        <div class="icon-area">
            <svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v3H9V7c0-1.654 1.346-3 3-3zm0 10c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2z"/>
            </svg>
        </div>

        <div class="content">
            <h1>Access Denied</h1>
            <div class="accent-line"></div>
            <p>
                Direktori ini dilindungi.<br>
                Anda tidak memiliki izin untuk melihat daftar file di folder ini.
            </p>
            
            <a href="/" class="btn-home">Kembali ke Beranda</a>
        </div>

        <div class="footer">
            PT Nusa Industri Teknologi
        </div>
    </div>

</body>
</html>
