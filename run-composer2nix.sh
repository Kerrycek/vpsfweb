#!/bin/sh
# composer update
mv vendor vendor.orig
composer2nix --name vpsfree-web
mv vendor.orig vendor
