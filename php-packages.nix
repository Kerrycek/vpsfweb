{composerEnv, fetchurl, fetchgit ? null, fetchhg ? null, fetchsvn ? null, noDev ? false}:

let
  packages = {
    "bacon/bacon-qr-code" = {
      targetDir = "";
      src = composerEnv.buildZipPackage {
        name = "bacon-bacon-qr-code-8674e51bb65af933a5ffaf1c308a660387c35c22";
        src = fetchurl {
          url = "https://api.github.com/repos/Bacon/BaconQrCode/zipball/8674e51bb65af933a5ffaf1c308a660387c35c22";
          sha256 = "0hb0w6m5rwzghw2im3yqn6ly2kvb3jgrv8jwra1lwd0ik6ckrngl";
        };
      };
    };
    "dasprid/enum" = {
      targetDir = "";
      src = composerEnv.buildZipPackage {
        name = "dasprid-enum-6faf451159fb8ba4126b925ed2d78acfce0dc016";
        src = fetchurl {
          url = "https://api.github.com/repos/DASPRiD/Enum/zipball/6faf451159fb8ba4126b925ed2d78acfce0dc016";
          sha256 = "1c3c7zdmpd5j1pw9am0k3mj8n17vy6xjhsh2qa7c0azz0f21jk4j";
        };
      };
    };
    "endroid/qr-code" = {
      targetDir = "";
      src = composerEnv.buildZipPackage {
        name = "endroid-qr-code-0db25b506a8411a5e1644ebaa67123a6eb7b6a77";
        src = fetchurl {
          url = "https://api.github.com/repos/endroid/qr-code/zipball/0db25b506a8411a5e1644ebaa67123a6eb7b6a77";
          sha256 = "1xxh8nh6zay6az0cx69v13gkwgfr42a5k79p1cnqfnpqgij3jy3g";
        };
      };
    };
    "haveapi/client" = {
      targetDir = "";
      src = composerEnv.buildZipPackage {
        name = "haveapi-client-70ca99bab02f54c08a1d4dedf822f0d8fe6d1bf8";
        src = fetchurl {
          url = "https://api.github.com/repos/vpsfreecz/haveapi-client-php/zipball/70ca99bab02f54c08a1d4dedf822f0d8fe6d1bf8";
          sha256 = "0wz3f9dyzn7brnsbspjyxc2jmcmv1mzj81ilnvjky1sw0a2l4nhr";
        };
      };
    };
    "rikudou/iban" = {
      targetDir = "";
      src = composerEnv.buildZipPackage {
        name = "rikudou-iban-7fe69bf9274792c37d5a8d9d38ef5cb000f8377a";
        src = fetchurl {
          url = "https://api.github.com/repos/RikudouSage/IBAN/zipball/7fe69bf9274792c37d5a8d9d38ef5cb000f8377a";
          sha256 = "0ybgp3pkd1gdz7m0pkdacm3bgshphwwsdw967bk5dawgd7dqlskl";
        };
      };
    };
    "rikudou/qr-payment-interface" = {
      targetDir = "";
      src = composerEnv.buildZipPackage {
        name = "rikudou-qr-payment-interface-752f7a6bf1190c7d65ead90b5989f61927436c89";
        src = fetchurl {
          url = "https://api.github.com/repos/RikudouSage/QrPaymentInterface/zipball/752f7a6bf1190c7d65ead90b5989f61927436c89";
          sha256 = "04yaibr52rzgyimmq1d69pvpkj8ji5agbhjb1xiq8bm7m0zv8k9i";
        };
      };
    };
    "rikudou/qr-payment-qr-code-provider" = {
      targetDir = "";
      src = composerEnv.buildZipPackage {
        name = "rikudou-qr-payment-qr-code-provider-06e77aca04f3e6bb41da57eb9e880d7ec664cb90";
        src = fetchurl {
          url = "https://api.github.com/repos/RikudouSage/QrPaymentQrCodeProvider/zipball/06e77aca04f3e6bb41da57eb9e880d7ec664cb90";
          sha256 = "0rij5pywcd9cq8fhdsk8acwxxx9crcap5r78xigv6hd332b2i1i0";
        };
      };
    };
    "rikudou/skqrpayment" = {
      targetDir = "";
      src = composerEnv.buildZipPackage {
        name = "rikudou-skqrpayment-6d106fad831099dda24a33207eba647ad57530aa";
        src = fetchurl {
          url = "https://api.github.com/repos/RikudouSage/QrPaymentSK/zipball/6d106fad831099dda24a33207eba647ad57530aa";
          sha256 = "0nhxbxawbpn567df6ynl6a4y9w9hqcmdc8gm0c6mrg7hi1mhlfdr";
        };
      };
    };
    "vpsfreecz/httpful" = {
      targetDir = "";
      src = composerEnv.buildZipPackage {
        name = "vpsfreecz-httpful-770a0e173e304ebbabf8424ab86a0917bd61622f";
        src = fetchurl {
          url = "https://api.github.com/repos/vpsfreecz/httpful/zipball/770a0e173e304ebbabf8424ab86a0917bd61622f";
          sha256 = "0h9slrf711sa27dbfgi8q3p9h9iwbxzw6sg3z0f069vy2dy2kyjl";
        };
      };
    };
  };
  devPackages = {};
in
composerEnv.buildPackage {
  inherit packages devPackages noDev;
  name = "vpsfree-web";
  src = ./.;
  executable = false;
  symlinkDependencies = false;
  meta = {};
}
