import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  considerations: z.string().min(1),
  instructions: z.string().optional(),
  slide: z.object({
    slide_type: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    main_insight: z.string().optional(),
    business_implication: z.string().optional(),
    supporting_insights: z.array(z.string()).optional(),
  }),
  projectContext: z
    .object({
      account: z.string().optional(),
      channels: z.array(z.string()).optional(),
      subcategories: z.array(z.string()).optional(),
      objective: z.string().optional(),
      visualIdentity: z
        .object({ name: z.string(), colors: z.array(z.string()) })
        .optional(),
    })
    .optional(),
});

const OutputSchema = z.object({
  updated_title: z.string(),
  updated_insight: z.string(),
  updated_business_implication: z.string(),
  updated_visual_direction: z.string(),
  change_summary: z.string(),
});

export type RewriteSlideOutput = z.infer<typeof OutputSchema>;

export const rewriteSlideWithAI = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY no configurada.");

    const gateway = createLovableAiGatewayProvider(key, true);
    const model = gateway("openai/gpt-5.5");

    const prompt = `Eres un editor senior de storytelling ejecutivo para presentaciones de investigación de mercados.

CONTEXTO DEL PROYECTO:
- Cuenta: ${data.projectContext?.account ?? "n/d"}
- Canales: ${(data.projectContext?.channels ?? []).join(", ") || "n/d"}
- Subcategorías: ${(data.projectContext?.subcategories ?? []).join(", ") || "n/d"}
- Objetivo: ${data.projectContext?.objective ?? "n/d"}
${data.projectContext?.visualIdentity
        ? `- Visual Identity: ${data.projectContext.visualIdentity.name} (paleta HEX: ${data.projectContext.visualIdentity.colors.join(", ")})`
        : ""}

SLIDE ACTUAL (esta es la ÚNICA diapositiva a modificar; no toques el resto de la presentación):
- Tipo: ${data.slide.slide_type}
- Título: ${data.slide.title}
- Subtítulo: ${data.slide.subtitle ?? ""}
- Insight principal: ${data.slide.main_insight ?? ""}
- Implicancia de negocio: ${data.slide.business_implication ?? ""}
- Insights de apoyo: ${(data.slide.supporting_insights ?? []).join(" | ")}

CONSIDERACIONES ESTRATÉGICAS GLOBALES DEL PROYECTO:
"""
${data.considerations}
"""
${data.instructions?.trim()
        ? `INSTRUCCIONES ESPECÍFICAS DEL USUARIO PARA ESTA DIAPOSITIVA (prioritarias):
"""
${data.instructions}
"""`
        : ""}

Reescribe SOLO esta diapositiva. Mantén precisión de datos, tono ejecutivo y titulares de máx 90 caracteres. Devuelve exactamente los campos pedidos, sin markdown, en español.`;

    try {
      const { output } = await generateText({
        model,
        prompt,
        output: Output.object({ schema: OutputSchema }),
      });
      return output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("La IA devolvió una respuesta no válida. Intenta de nuevo.");
      }
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("429")) throw new Error("Límite de uso alcanzado. Intenta en unos minutos.");
      if (msg.includes("402")) throw new Error("Créditos de IA agotados en el workspace.");
      throw new Error(`Error de IA: ${msg}`);
    }
  });
