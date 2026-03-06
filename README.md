vpsFree.cz
==========

This repository contains the source code of
[https://vpsfree.cz](https://vpsfree.cz) and its translations.

Every translation is in a standalone document root, i.e. `cs/` or `en/`. The
site is built using server-side includes and PHP, so the web server must
support them.

Shared directories, like `css/`, `js/`, `obrazky/` and `download/` have to be
aliased within the document roots of every translation.

## Installation

Copy `config.php.dist` to `config.php` and fill in the URL to the vpsAdmin API.

## Example Apache configuration

```apache
<VirtualHost *:80>
	ServerName vpsfree.cz
	DocumentRoot /var/www/web/cs

	Alias /css /var/www/web/css
	Alias /js /var/www/web/js
	Alias /obrazky /var/www/web/obrazky
	Alias /download /var/www/web/download

	<Directory /var/www/web/cs>
		Options +Includes
		AddOutputFilter INCLUDES .html
		SetEnv no-gzip
		ErrorDocument 404 /404.html
	</Directory>
</VirtualHost>

<VirtualHost *:80>
	ServerName vpsfree.org
	DocumentRoot /var/www/web/en

	Alias /css /var/www/web/css
	Alias /js /var/www/web/js
	Alias /obrazky /var/www/web/obrazky
	Alias /download /var/www/web/download

	<Directory /var/www/web/en>
		Options +Includes
		AddOutputFilter INCLUDES .html
		SetEnv no-gzip
		ErrorDocument 404 /404.html
	</Directory>
</VirtualHost>
```
