"""
WordPress Health Dashboard Analyzers
Comprehensive website analysis for performance, SEO, security, technical, and accessibility
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import ssl
import socket
from typing import Dict, List, Optional
import re
from datetime import datetime
import json


class PerformanceAnalyzer:
    """Analyze website performance using Google PageSpeed Insights"""
    
    @staticmethod
    async def analyze(url: str, api_key: Optional[str] = None) -> Dict:
        """Run performance analysis using PageSpeed Insights"""
        try:
            # Google PageSpeed Insights API
            api_url = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
            params = {
                "url": url,
                "strategy": "mobile",
                "category": ["performance", "accessibility", "best-practices", "seo"]
            }
            
            if not api_key:
                return PerformanceAnalyzer._basic_performance_check(url)

            params["key"] = api_key
            try:
                response = requests.get(api_url, params=params, timeout=30)
            except requests.Timeout:
                print(f"PageSpeed API timeout for {url}")
                return PerformanceAnalyzer._basic_performance_check(url)
            except requests.ConnectionError:
                print(f"PageSpeed API connection error for {url}")
                return PerformanceAnalyzer._basic_performance_check(url)

            data = response.json()
            
            if response.status_code == 200:
                lighthouse = data.get("lighthouseResult", {})
                metrics = lighthouse.get("audits", {})
                
                # Extract Core Web Vitals
                fcp = metrics.get("first-contentful-paint", {}).get("numericValue", 0) / 1000
                lcp = metrics.get("largest-contentful-paint", {}).get("numericValue", 0) / 1000
                tti = metrics.get("interactive", {}).get("numericValue", 0) / 1000
                tbt = metrics.get("total-blocking-time", {}).get("numericValue", 0)
                cls = metrics.get("cumulative-layout-shift", {}).get("numericValue", 0)
                
                # Get performance score
                categories = lighthouse.get("categories", {})
                perf_score = int(categories.get("performance", {}).get("score", 0) * 100)
                
                return {
                    "score": perf_score,
                    "metrics": {
                        "fcp": round(fcp, 2),
                        "lcp": round(lcp, 2),
                        "tti": round(tti, 2),
                        "tbt": round(tbt, 0),
                        "cls": round(cls, 3)
                    },
                    "issues": PerformanceAnalyzer._generate_issues(perf_score, fcp, lcp, cls),
                    "recommendations": PerformanceAnalyzer._generate_recommendations(perf_score)
                }
            else:
                # Fallback to basic check
                return PerformanceAnalyzer._basic_performance_check(url)
    
        except requests.Timeout:
            print(f"PageSpeed analysis timeout for {url}")
            return PerformanceAnalyzer._basic_performance_check(url)
        except (requests.ConnectionError, requests.RequestException) as e:
            print(f"PageSpeed API error: {str(e)}")
            return PerformanceAnalyzer._basic_performance_check(url)
        except (ValueError, KeyError) as e:
            print(f"PageSpeed response parsing error: {str(e)}")
            return PerformanceAnalyzer._basic_performance_check(url)
        except Exception as e:
            print(f"Unexpected PageSpeed error: {str(e)}")
            return PerformanceAnalyzer._basic_performance_check(url)
    
    @staticmethod
    def _basic_performance_check(url: str) -> Dict:
        """Basic performance check without PageSpeed API"""
        try:
                start_time = datetime.now()
                load_time = 0
                page_size = 0
                response = None
            
                try:
                    response = requests.get(url, timeout=10)
                except requests.Timeout:
                    load_time = 10.0  # Max timeout
                except requests.ConnectionError:
                    load_time = 0  # Unable to measure
                else:
                    load_time = (datetime.now() - start_time).total_seconds()
            
                if response:
                    page_size = len(response.content) / 1024  # KB
            
                # Simple scoring based on load time and size
                if load_time < 2 and page_size < 1000:
                    score = 90
                elif load_time < 4 and page_size < 2000:
                    score = 70
                else:
                    score = 50
            
                return {
                    "score": score,
                    "metrics": {
                        "load_time": round(load_time, 2),
                        "page_size_kb": round(page_size, 2)
                    },
                    "issues": [],
                    "recommendations": ["Enable caching", "Compress images", "Minify CSS/JS"]
                }
        except Exception as e:
            return {"score": 0, "metrics": {}, "issues": [str(e)], "recommendations": []}
    
    @staticmethod
    def _generate_issues(score: int, fcp: float, lcp: float, cls: float) -> List[str]:
        issues = []
        if fcp > 3.0:
            issues.append("First Contentful Paint is slow (>3s)")
        if lcp > 2.5:
            issues.append("Largest Contentful Paint exceeds 2.5s")
        if cls > 0.1:
            issues.append("Cumulative Layout Shift is high")
        if score < 50:
            issues.append("Overall performance score is poor")
        return issues
    
    @staticmethod
    def _generate_recommendations(score: int) -> List[str]:
        recs = []
        if score < 90:
            recs.extend([
                "Optimize images (use WebP format, lazy loading)",
                "Minimize JavaScript execution time",
                "Enable text compression (gzip/brotli)",
                "Use a CDN for static assets",
                "Implement browser caching"
            ])
        return recs


class SEOAnalyzer:
    """Analyze SEO health of the website"""
    
    @staticmethod
    async def analyze(url: str, html: str, soup: BeautifulSoup) -> Dict:
        """Comprehensive SEO analysis"""
        issues = []
        recommendations = []
        details = {}
        
        # Meta tags
        title = soup.find("title")
        title_text = title.string if title else ""
        meta_desc = soup.find("meta", {"name": "description"})
        meta_desc_content = meta_desc.get("content", "") if meta_desc else ""
        viewport = soup.find("meta", {"name": "viewport"})
        
        if not title_text:
            issues.append("Missing page title")
            recommendations.append("Add a descriptive title tag (50-60 characters)")
        elif len(title_text) < 30 or len(title_text) > 60:
            issues.append(f"Title length suboptimal ({len(title_text)} chars)")
            recommendations.append("Optimize title length to 50-60 characters")
        
        if not meta_desc_content:
            issues.append("Missing meta description")
            recommendations.append("Add meta description (150-160 characters)")
        elif len(meta_desc_content) < 120 or len(meta_desc_content) > 160:
            issues.append(f"Meta description length suboptimal ({len(meta_desc_content)} chars)")
        
        if not viewport:
            issues.append("Missing viewport meta tag")
            recommendations.append("Add viewport meta tag for mobile responsiveness")
        
        # Heading structure
        h1_tags = soup.find_all("h1")
        if len(h1_tags) == 0:
            issues.append("No H1 tag found")
            recommendations.append("Add exactly one H1 tag with main keyword")
        elif len(h1_tags) > 1:
            issues.append(f"Multiple H1 tags found ({len(h1_tags)})")
            recommendations.append("Use only one H1 tag per page")
        
        # Images without alt text
        images = soup.find_all("img")
        images_without_alt = [img for img in images if not img.get("alt")]
        if images_without_alt:
            issues.append(f"{len(images_without_alt)} images missing alt text")
            recommendations.append("Add descriptive alt text to all images")
        
        # Canonical tag
        canonical = soup.find("link", {"rel": "canonical"})
        if not canonical:
            issues.append("Missing canonical tag")
            recommendations.append("Add canonical tag to avoid duplicate content issues")
        
        # Open Graph tags
        og_title = soup.find("meta", {"property": "og:title"})
        og_desc = soup.find("meta", {"property": "og:description"})
        og_image = soup.find("meta", {"property": "og:image"})
        
        if not all([og_title, og_desc, og_image]):
            issues.append("Incomplete Open Graph tags")
            recommendations.append("Add complete OG tags for better social sharing")
        
        # Check for sitemap and robots.txt
        base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        has_sitemap = SEOAnalyzer._check_url_exists(f"{base_url}/sitemap.xml")
        has_robots = SEOAnalyzer._check_url_exists(f"{base_url}/robots.txt")
        
        if not has_sitemap:
            issues.append("XML sitemap not found")
            recommendations.append("Create and submit XML sitemap to search engines")
        
        if not has_robots:
            issues.append("robots.txt not found")
            recommendations.append("Add robots.txt file to control crawling")
        
        # Calculate score
        total_checks = 10
        passed_checks = total_checks - len(issues)
        score = int((passed_checks / total_checks) * 100)
        
        details = {
            "title": title_text,
            "title_length": len(title_text),
            "meta_description": meta_desc_content,
            "meta_description_length": len(meta_desc_content),
            "h1_count": len(h1_tags),
            "images_total": len(images),
            "images_without_alt": len(images_without_alt),
            "has_canonical": bool(canonical),
            "has_open_graph": bool(og_title and og_desc and og_image),
            "has_sitemap": has_sitemap,
            "has_robots": has_robots
        }
        
        return {
            "score": score,
            "issues": issues,
            "recommendations": recommendations,
            "details": details
        }
    
    @staticmethod
    def _check_url_exists(url: str) -> bool:
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            return response.status_code == 200
        except requests.RequestException:
            return False


class SecurityAnalyzer:
    """Analyze website security"""
    
    @staticmethod
    async def analyze(url: str) -> Dict:
        issues = []
        recommendations = []
        details = {}
        
        parsed_url = urlparse(url)
        hostname = parsed_url.netloc
        
        # SSL Certificate check
        has_ssl = parsed_url.scheme == "https"
        details["has_ssl"] = has_ssl
        
        if not has_ssl:
            issues.append("Site not using HTTPS")
            recommendations.append("Install SSL certificate and redirect HTTP to HTTPS")
        else:
            # Check SSL certificate validity
            try:
                context = ssl.create_default_context()
                with socket.create_connection((hostname, 443), timeout=5) as sock:
                    with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                        cert = ssock.getpeercert()
                        details["ssl_valid"] = True
                        details["ssl_issuer"] = dict(x[0] for x in cert.get("issuer", []))
            except Exception as e:
                issues.append(f"SSL certificate issue: {str(e)}")
                details["ssl_valid"] = False
        
        # Security headers check
        try:
            response = requests.get(url, timeout=10)
            headers = response.headers
            
            security_headers = {
                "Strict-Transport-Security": "HSTS header missing",
                "X-Content-Type-Options": "X-Content-Type-Options header missing",
                "X-Frame-Options": "X-Frame-Options header missing (clickjacking risk)",
                "Content-Security-Policy": "CSP header missing",
                "X-XSS-Protection": "XSS Protection header missing"
            }
            
            details["security_headers"] = {}
            for header, message in security_headers.items():
                has_header = header in headers
                details["security_headers"][header] = has_header
                if not has_header:
                    issues.append(message)
                    recommendations.append(f"Add {header} security header")
            
            # WordPress version detection
            wp_version = SecurityAnalyzer._detect_wordpress_version(response.text)
            if wp_version:
                details["wordpress_version"] = wp_version
                details["version_exposed"] = True
                issues.append(f"WordPress version exposed: {wp_version}")
                recommendations.append("Hide WordPress version to reduce attack surface")
            else:
                details["wordpress_version"] = None
                details["version_exposed"] = False
                
        except Exception as e:
            issues.append(f"Error checking security headers: {str(e)}")
        
        # Calculate score
        max_score = 100
        deductions = len(issues) * 10
        score = max(0, max_score - deductions)
        
        return {
            "score": score,
            "issues": issues,
            "recommendations": recommendations,
            "details": details
        }
    
    @staticmethod
    def _detect_wordpress_version(html: str) -> Optional[str]:
        """Detect WordPress version from HTML"""
        patterns = [
            r'<meta name="generator" content="WordPress ([0-9.]+)"',
            r'wp-includes.*ver=([0-9.]+)',
            r'wp-content.*ver=([0-9.]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, html)
            if match:
                return match.group(1)
        return None


class TechnicalSEOAnalyzer:
    """Analyze technical SEO aspects"""
    
    @staticmethod
    async def analyze(url: str, soup: BeautifulSoup) -> Dict:
        issues = []
        recommendations = []
        details = {}
        
        # Check for broken links (sample first 10 internal links)
        links = soup.find_all("a", href=True)
        internal_links = [link["href"] for link in links[:10] if link["href"].startswith("/") or urlparse(url).netloc in link["href"]]
        
        broken_links = []
        for link in internal_links:
            full_url = urljoin(url, link)
            try:
                response = requests.head(full_url, timeout=5, allow_redirects=True)
                if response.status_code >= 400:
                    broken_links.append(full_url)
            except requests.RequestException:
                broken_links.append(full_url)
        
        if broken_links:
            issues.append(f"{len(broken_links)} broken links found (sampled)")
            recommendations.append("Fix or remove broken links")
        
        details["broken_links_count"] = len(broken_links)
        details["broken_links_sample"] = broken_links[:5]
        
        # Check for redirects
        try:
            response = requests.get(url, timeout=10, allow_redirects=False)
            if response.status_code in [301, 302, 307, 308]:
                issues.append(f"Page has redirect ({response.status_code})")
                recommendations.append("Minimize redirect chains")
                details["has_redirect"] = True
            else:
                details["has_redirect"] = False
        except requests.RequestException:
            details["has_redirect"] = False
        
        # Indexability check (meta robots)
        meta_robots = soup.find("meta", {"name": "robots"})
        if meta_robots:
            content = meta_robots.get("content", "").lower()
            if "noindex" in content:
                issues.append("Page is set to noindex")
                recommendations.append("Remove noindex if page should be indexed")
            details["meta_robots"] = content
        else:
            details["meta_robots"] = "index,follow"  # default
        
        # Mobile-friendly check (viewport)
        viewport = soup.find("meta", {"name": "viewport"})
        details["mobile_friendly"] = bool(viewport)
        if not viewport:
            issues.append("Missing viewport meta tag (not mobile-friendly)")
            recommendations.append("Add viewport meta tag for mobile optimization")
        
        # Calculate score
        max_score = 100
        deductions = len(issues) * 15
        score = max(0, max_score - deductions)
        
        return {
            "score": score,
            "issues": issues,
            "recommendations": recommendations,
            "details": details
        }


class AccessibilityAnalyzer:
    """Analyze website accessibility (WCAG compliance)"""
    
    @staticmethod
    async def analyze(soup: BeautifulSoup) -> Dict:
        issues = []
        recommendations = []
        details = {}
        
        # Images without alt text
        images = soup.find_all("img")
        images_without_alt = [img for img in images if not img.get("alt")]
        
        if images_without_alt:
            issues.append(f"{len(images_without_alt)}/{len(images)} images missing alt text")
            recommendations.append("Add descriptive alt text to all images for screen readers")
        
        details["images_total"] = len(images)
        details["images_without_alt"] = len(images_without_alt)
        
        # Form inputs without labels
        inputs = soup.find_all("input")
        inputs_without_label = []
        for inp in inputs:
            input_id = inp.get("id")
            if input_id:
                label = soup.find("label", {"for": input_id})
                if not label and inp.get("type") not in ["hidden", "submit", "button"]:
                    inputs_without_label.append(input_id)
            elif inp.get("type") not in ["hidden", "submit", "button"]:
                inputs_without_label.append("unlabeled")
        
        if inputs_without_label:
            issues.append(f"{len(inputs_without_label)} form inputs without labels")
            recommendations.append("Add labels to all form inputs for accessibility")
        
        details["inputs_total"] = len(inputs)
        details["inputs_without_label"] = len(inputs_without_label)
        
        # Missing lang attribute
        html_tag = soup.find("html")
        if html_tag and not html_tag.get("lang"):
            issues.append("Missing lang attribute on <html> tag")
            recommendations.append("Add lang attribute to specify page language")
        
        details["has_lang_attribute"] = bool(html_tag and html_tag.get("lang"))
        
        # Check for heading hierarchy
        headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
        heading_levels = [int(h.name[1]) for h in headings]
        
        # Check for skipped heading levels
        skipped_levels = False
        for i in range(len(heading_levels) - 1):
            if heading_levels[i+1] > heading_levels[i] + 1:
                skipped_levels = True
                break
        
        if skipped_levels:
            issues.append("Heading hierarchy has skipped levels")
            recommendations.append("Maintain proper heading hierarchy (don't skip levels)")
        
        details["has_proper_heading_hierarchy"] = not skipped_levels
        
        # ARIA landmarks
        landmarks = soup.find_all(["header", "nav", "main", "footer", "aside"])
        details["has_landmarks"] = len(landmarks) > 0
        
        if len(landmarks) == 0:
            issues.append("No ARIA landmarks found")
            recommendations.append("Use semantic HTML5 landmarks (header, nav, main, footer)")
        
        # Calculate WCAG compliance level estimate
        total_checks = 6
        passed_checks = total_checks - len(issues)
        score = int((passed_checks / total_checks) * 100)
        
        # Estimate WCAG level - initialize with default
        wcag_level = "Non-compliant"  # Default value
        if score >= 90:
            wcag_level = "AA"
        elif score >= 70:
            wcag_level = "Partial A"
        
        details["wcag_estimate"] = wcag_level
        
        return {
            "score": score,
            "wcag_level": wcag_level,
            "issues": issues,
            "recommendations": recommendations,
            "details": details
        }


class WordPressDetector:
    """Detect if site is WordPress and get details"""
    
    @staticmethod
    def detect(html: str, soup: BeautifulSoup) -> Dict:
        """Detect WordPress and gather information"""
        indicators = {
            "wp-content": "/wp-content/" in html,
            "wp-includes": "/wp-includes/" in html,
            "wp-json": "/wp-json/" in html,
            "generator_meta": bool(soup.find("meta", {"name": "generator", "content": re.compile("WordPress", re.I)})),
            "wp_emoji": "wp-emoji" in html,
            "xmlrpc": "xmlrpc.php" in html
        }
        
        is_wordpress = any(indicators.values())
        confidence = sum(indicators.values()) / len(indicators) * 100
        
        # Detect theme
        theme_match = re.search(r'/wp-content/themes/([^/]+)/', html)
        theme = theme_match.group(1) if theme_match else None
        
        # Detect plugins (first 5)
        plugin_matches = re.findall(r'/wp-content/plugins/([^/]+)/', html)
        plugins = list(set(plugin_matches))[:5]
        
        return {
            "is_wordpress": is_wordpress,
            "confidence": round(confidence, 1),
            "indicators": indicators,
            "theme": theme,
            "plugins": plugins
        }
