#import <Foundation/Foundation.h>
#import <CoreGraphics/CoreGraphics.h>
#import <ImageIO/ImageIO.h>

void drawChainLogo(CGContextRef ctx, CGFloat size, CGFloat scaleFactor) {
    // Solid asphalt dark background #111111
    CGContextSetRGBFillColor(ctx, 17.0/255.0, 17.0/255.0, 17.0/255.0, 1.0);
    CGContextFillRect(ctx, CGRectMake(0, 0, size, size));
    
    CGContextSaveGState(ctx);
    
    // Center at (size/2, size/2)
    CGContextTranslateCTM(ctx, size / 2.0, size / 2.0);
    
    // Scale factor applied around center (12, 12 in 24x24 coordinate system)
    CGFloat baseScale = (size / 24.0) * scaleFactor;
    CGContextScaleCTM(ctx, baseScale, -baseScale); // Flip Y to match SVG coordinate orientation
    CGContextTranslateCTM(ctx, -12.0, -12.0);
    
    // Stroke parameters: Volt #F2F455
    CGContextSetRGBStrokeColor(ctx, 242.0/255.0, 244.0/255.0, 85.0/255.0, 1.0);
    CGContextSetLineWidth(ctx, 2.3);
    CGContextSetLineCap(ctx, kCGLineCapRound);
    CGContextSetLineJoin(ctx, kCGLineJoinRound);
    CGContextSetAllowsAntialiasing(ctx, true);
    CGContextSetShouldAntialias(ctx, true);
    
    // Left roller circle: cx=7, cy=12, r=3.5
    CGContextAddArc(ctx, 7.0, 12.0, 3.5, 0, 2 * M_PI, 0);
    CGContextStrokePath(ctx);
    
    // Right roller circle: cx=17, cy=12, r=3.5
    CGContextAddArc(ctx, 17.0, 12.0, 3.5, 0, 2 * M_PI, 0);
    CGContextStrokePath(ctx);
    
    // Top waist link plate curve: M 9.5, 9.2 C 11.1, 10.1, 12.9, 10.1, 14.5, 9.2
    CGContextMoveToPoint(ctx, 9.5, 9.2);
    CGContextAddCurveToPoint(ctx, 9.5 + 1.6, 9.2 + 0.9, 9.5 + 3.4, 9.2 + 0.9, 14.5, 9.2);
    CGContextStrokePath(ctx);
    
    // Bottom waist link plate curve: M 9.5, 14.8 C 11.1, 13.9, 12.9, 13.9, 14.5, 14.8
    CGContextMoveToPoint(ctx, 9.5, 14.8);
    CGContextAddCurveToPoint(ctx, 9.5 + 1.6, 14.8 - 0.9, 9.5 + 3.4, 14.8 - 0.9, 14.5, 14.8);
    CGContextStrokePath(ctx);
    
    CGContextRestoreGState(ctx);
}

void writePNG(NSString *path, CGFloat size, CGFloat scaleFactor) {
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef ctx = CGBitmapContextCreate(NULL, (size_t)size, (size_t)size, 8, (size_t)size * 4, colorSpace, (CGBitmapInfo)kCGImageAlphaNoneSkipLast);
    
    drawChainLogo(ctx, size, scaleFactor);
    
    CGImageRef img = CGBitmapContextCreateImage(ctx);
    CFURLRef url = (__bridge CFURLRef)[NSURL fileURLWithPath:path];
    CGImageDestinationRef dest = CGImageDestinationCreateWithURL(url, (CFStringRef)@"public.png", 1, NULL);
    CGImageDestinationAddImage(dest, img, NULL);
    CGImageDestinationFinalize(dest);
    
    CFRelease(dest);
    CGImageRelease(img);
    CGContextRelease(ctx);
    CGColorSpaceRelease(colorSpace);
    printf("Generated %s (%dx%d, solid #111111 background)\n", [path UTF8String], (int)size, (int)size);
}

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        // Master app icon (512x512)
        writePNG(@"public/app-icon.png", 512, 0.92);
        // iOS Apple Touch Icon (180x180 solid background)
        writePNG(@"public/apple-touch-icon.png", 180, 0.92);
        // Standard favicon (64x64)
        writePNG(@"public/favicon.png", 64, 0.92);
    }
    return 0;
}
